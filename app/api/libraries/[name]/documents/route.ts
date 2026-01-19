import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata, Library } from '@/lib/library';
import { extractMetadataFromFile } from '@/lib/library/documents/metadata-extractor';
import crypto from 'crypto';
import { loadLLMSettings } from '@/lib/library/settings/llm';
import { validateLibraryAccess, getLibraryPrisma, normalizeMetadata } from '@/lib/library/utils';

interface LLMSettings {
  providers: Array<{
    name: string;
    type: 'OpenAI' | 'Ollama';
    model: string;
    baseURL: string;
    apiKey?: string;
  }>;
  jobs: {
    metadataExtraction: string;
    imageTextExtraction: string;
  };
}

async function processFileImport(
  file: File,
  libraryName: string,
  libraryInfo: Library,
  llmSettings: LLMSettings
) {
  const allowedExtensions = ['.pdf', '.epub', '.djvu'];
  const fileExtension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error('Unsupported file type');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const prisma = await getLibraryPrisma(libraryName);
  const existingDoc = await prisma.document.findFirst({
    where: { hash }
  });
  if (existingDoc) {
    throw new Error('File already exists');
  }

  const libraryDir = libraryInfo.path;

  let metadata: DocumentMetadata;
  let cover: Uint8Array | null = null;
  let numPages = 0;
  try {
    // Use AI extraction for supported formats
    const result = await extractMetadataFromFile(buffer, fileExtension.slice(1), llmSettings);
    const { metadata: extractedMetadata, cover: extractedCover, numPages: extractedNumPages } = result;
    cover = extractedCover;
    numPages = extractedNumPages;
    const doctype = (extractedMetadata.doctype as string);
    metadata = {
      doctype: doctype || "Others",
      title: extractedMetadata.title as string || "Untitled",
      authors: extractedMetadata.authors as string[],
      publicationYear: extractedMetadata.publication_year as number || undefined,
      publisher: extractedMetadata.publisher as string || undefined,
      category: extractedMetadata.category as string,
      language: extractedMetadata.language as string,
      keywords: extractedMetadata.keywords as string[],
      abstract: extractedMetadata.abstract as string || '',
      metadata: extractedMetadata.metadata as Record<string, unknown> || undefined,
      favorite: false,
      numPages: extractedNumPages || 0,
      filesize: buffer.length,
      format: fileExtension.slice(1), // Remove the leading dot
    };

    metadata = normalizeMetadata(metadata);

  } catch (error) {
    console.error('Error extracting metadata:', error);
    throw new Error(`File parse failed ${error}`);
  }

  const categoryParts = metadata.category.split('>').map(part => part.trim()).filter(part => part);
  const folderPath = [metadata.doctype, ...categoryParts.slice(0, 2)].join('/'); // doctype + 2-level category folders
  const categoryDir = path.join(libraryDir, folderPath);

  await fs.promises.mkdir(categoryDir, { recursive: true });
  const safeTitle = metadata.title.replace(/[\/\\?%*:|"<>]/g, '_');
  let newFilename = `${safeTitle}${fileExtension}`;

  let counter = 1;
  while (true) {
    try {
      await fs.promises.access(path.join(categoryDir, newFilename));
    } catch {
      const existingDoc = await prisma.document.findFirst({ where: { filename: newFilename } });
      if (!existingDoc) break; // Unique
    }
    newFilename = `${safeTitle}_${counter}${fileExtension}`;
    counter++;
  }

  const finalFilePath = path.join(categoryDir, newFilename);
  await fs.promises.writeFile(finalFilePath, buffer);

  const url = `lib://` + `${folderPath}/${newFilename}`.replace(/\/+/g, '/');
  await prisma.document.create({
    data: {
      filename: newFilename,
      url,
      doctype: metadata.doctype,
      title: metadata.title,
      authors: JSON.stringify(metadata.authors),
      publicationYear: metadata.publicationYear,
      publisher: metadata.publisher,
      category: metadata.category,
      language: metadata.language,
      keywords: JSON.stringify(metadata.keywords || []),
      abstract: metadata.abstract,
      favorite: metadata.favorite || false,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      hash,
      numPages,
      filesize: BigInt(buffer.length),
      format: metadata.format,
      cover: cover ? Buffer.from(cover) : null,
    },
  });

  return {
    success: true,
    filename: newFilename,
    metadata
  };
}

async function processUrlImport(
  url: string,
  libraryName: string,
  libraryInfo: Library,
  llmSettings: LLMSettings
) {
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibraryImporter/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');

    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      throw new Error('File too large (max 100MB)');
    }

    let fileExtension = path.extname(new URL(url).pathname).toLowerCase();
    if (!fileExtension) {
      if (contentType.includes('pdf')) fileExtension = '.pdf';
      else if (contentType.includes('epub')) fileExtension = '.epub';
      else if (contentType.includes('djvu')) fileExtension = '.djvu';
      else throw new Error('Unable to determine file type from URL');
    }

    const allowedExtensions = ['.pdf', '.epub', '.djvu'];
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('Unsupported file type. Only PDF, EPUB, and DJVU are supported');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    clearTimeout(timeoutId);
    const file = new File([buffer], `imported${fileExtension}`, { type: contentType });

    return await processFileImport(file, libraryName, libraryInfo, llmSettings);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Download timeout (60 seconds)');
      }
      throw error;
    }
    throw new Error('Failed to download file');
  }
}



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const urlsString = formData.get('urls') as string;

    const llmSettings = loadLLMSettings();

    if (urlsString) {
      const urls = JSON.parse(urlsString) as string[];
      const results = [];
      const errors = [];

      for (const url of urls) {
        try {
          const result = await processUrlImport(url, name, libraryInfo, llmSettings);
          results.push(result);
        } catch (error) {
          console.error(`Error importing URL ${url}:`, error);
          errors.push({ url, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        errors,
        totalProcessed: urls.length,
        successCount: results.length,
        errorCount: errors.length
      });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await processFileImport(file, name, libraryInfo, llmSettings);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error importing file:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
