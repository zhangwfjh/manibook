import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata, Library } from '@/lib/library';
import { extractMetadataFromFile } from '@/app/library/metadata';
import crypto from 'crypto';
import { loadLLMSettings } from '@/lib/library/llm-settings';
import { validateLibraryAccess, dbDocumentToLibraryDocument, buildCategoryTree, getLibraryPrisma } from '@/lib/library/api-utils';

interface LLMSettings {
  providers: Array<{
    name: string;
    type: 'openai-compatible' | 'ollama';
    model: string;
    baseURL: string;
    apiKey?: string;
  }>;
  jobs: {
    metadataExtraction: string;
    imageTextExtraction: string;
  };
}

async function processFileUpload(
  file: File,
  libraryName: string,
  libraryInfo: Library,
  llmSettings: LLMSettings
) {
  // Validate file type
  const allowedExtensions = ['.pdf', '.epub', '.djvu'];
  const fileExtension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error('Unsupported file type');
  }

  // Get file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Compute SHA256 hash
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  const prisma = getLibraryPrisma(libraryName);

  // Check if file already exists
  const existingDoc = await prisma.document.findFirst({
    where: { hash }
  });
  if (existingDoc) {
    throw new Error('File already exists');
  }

  // Use library root directory
  const libraryDir = libraryInfo.path;

  // Generate AI-powered metadata
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
      doctype: doctype as 'Article' | 'Book' | 'Others',
      title: extractedMetadata.title as string,
      authors: extractedMetadata.authors as string[],
      publication_year: extractedMetadata.publication_year as number || undefined,
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

  } catch (error) {
    console.error('Error extracting metadata:', error);
    throw new Error('File parse failed');
  }

  // Parse category for folder structure
  const categoryParts = metadata.category.split('>').map(part => part.trim()).filter(part => part);
  const folderPath = [metadata.doctype, ...categoryParts.slice(0, 2)].join('/'); // doctype + 2-level category folders
  const categoryDir = path.join(libraryDir, folderPath);

  // Ensure category directory exists
  fs.mkdirSync(categoryDir, { recursive: true });

  // Generate filename from title
  const safeTitle = metadata.title.replace(/[\/\\?%*:|"<>]/g, '_');
  let newFilename = `${safeTitle}${fileExtension}`;

  // Ensure filename uniqueness
  let counter = 1;
  while (fs.existsSync(path.join(categoryDir, newFilename))) {
    newFilename = `${safeTitle}_${counter}${fileExtension}`;
    counter++;
  }

  // Save file to final location
  const finalFilePath = path.join(categoryDir, newFilename);
  fs.writeFileSync(finalFilePath, buffer);

  // Save cover image if available (now that we have the final filename and directory)
  if (cover) {
    const coverFilename = `[Cover] ${newFilename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
    const coverPath = path.join(categoryDir, coverFilename);
    fs.writeFileSync(coverPath, cover);
  }

  // Save to database
  const url = `lib://` + `${folderPath}/${newFilename}`.replace(/\/+/g, '/');
  await prisma.document.create({
    data: {
      filename: newFilename,
      url,
      doctype: metadata.doctype,
      title: metadata.title,
      authors: JSON.stringify(metadata.authors),
      publicationYear: metadata.publication_year,
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
  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Download file from URL with timeout
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

    // Check file size limit (100MB)
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      throw new Error('File too large (max 100MB)');
    }

    // Get file extension from URL or content-type
    let fileExtension = path.extname(new URL(url).pathname).toLowerCase();
    if (!fileExtension) {
      if (contentType.includes('pdf')) fileExtension = '.pdf';
      else if (contentType.includes('epub')) fileExtension = '.epub';
      else if (contentType.includes('djvu')) fileExtension = '.djvu';
      else throw new Error('Unable to determine file type from URL');
    }

    // Validate file type
    const allowedExtensions = ['.pdf', '.epub', '.djvu'];
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('Unsupported file type. Only PDF, EPUB, and DJVU are supported');
    }

    // Get file buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    clearTimeout(timeoutId);

    // Create a File-like object for processing
    const file = new File([buffer], `imported${fileExtension}`, { type: contentType });

    // Process the downloaded file
    return await processFileUpload(file, libraryName, libraryInfo, llmSettings);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Validate library access
    const validation = validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = getLibraryPrisma(name);

    // Fetch all documents from database
    const dbDocuments = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const documents = dbDocuments.map(dbDoc => dbDocumentToLibraryDocument(dbDoc, name));

    if (category) {
      // Filter documents by category
      const filteredDocuments = documents.filter(doc =>
        doc.metadata.category.startsWith(category)
      );
      return NextResponse.json({ documents: filteredDocuments });
    } else {
      // Return categories and all documents
      const categories = buildCategoryTree(documents);
      return NextResponse.json({ categories, documents });
    }
  } catch (error) {
    console.error('Error in documents API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Validate library access
    const validation = validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const urlsString = formData.get('urls') as string;

    // Load LLM settings from server
    const llmSettings = loadLLMSettings();

    // Handle URL imports
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

    // Handle file upload (existing logic)
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const result = await processFileUpload(file, name, libraryInfo, llmSettings);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
