import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata, Library } from '@/lib/library';
import { extractMetadataFromFile } from '@/lib/library/documents/metadata-extractor';
import crypto from 'crypto';
import { loadLLMSettings } from '@/lib/library/settings/llm';
import { validateLibraryAccess, dbDocumentToLibraryDocument, getLibraryPrisma, normalizeMetadata, toProperTitleCase } from '@/lib/library/utils';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Max 200 per page
    const offset = (page - 1) * limit;

    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const formats = searchParams.get('formats')?.split(',').filter(Boolean) || [];
    const authors = searchParams.get('authors')?.split(',').filter(Boolean) || [];
    const publishers = searchParams.get('publishers')?.split(',').filter(Boolean) || [];
    const languages = searchParams.get('languages')?.split(',').filter(Boolean) || [];
    const showFavoritesOnly = searchParams.get('favoritesOnly') === 'true';

    const sortBy = searchParams.get('sortBy') || 'createdAt-desc';
    const [sortField, sortOrder] = sortBy.split('-');

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    type WhereCondition = Record<string, unknown>;
    type WhereConditions = {
      AND?: WhereCondition[];
      OR?: WhereCondition[];
      [key: string]: unknown;
    };
    const whereConditions: WhereConditions = {};

    if (category) {
      const categoryParts = category.split(" > ");
      if (categoryParts.length >= 1) {
        const selectedDoctype = categoryParts[0];
        whereConditions.doctype = selectedDoctype;

        if (categoryParts.length > 1) {
          const selectedCategoryPath = categoryParts.slice(1).join(" > ");
          whereConditions.category = {
            startsWith: selectedCategoryPath
          };
        }
      }
    }

    if (keywords.length > 0) {
      whereConditions.OR = keywords.map(keyword => ({
        keywords: {
          contains: keyword
        }
      }));
    }

    if (formats.length > 0) {
      whereConditions.format = {
        in: formats.map(f => f.toLowerCase())
      };
    }

    if (authors.length > 0) {
      const authorConditions = authors.map(author => ({
        authors: {
          contains: author
        }
      }));

      if (whereConditions.OR) {
        whereConditions.OR.push(...authorConditions);
      } else {
        whereConditions.OR = authorConditions;
      }
    }

    if (publishers.length > 0) {
      whereConditions.publisher = {
        in: publishers
      };
    }

    if (languages.length > 0) {
      whereConditions.language = {
        in: languages
      };
    }

    if (showFavoritesOnly) {
      whereConditions.favorite = true;
    }

    if (searchQuery) {
      const searchCondition = {
        OR: [
          { title: { contains: searchQuery } },
          { authors: { contains: searchQuery } },
          { keywords: { contains: searchQuery } },
          { publisher: { contains: searchQuery } },
          { abstract: { contains: searchQuery } },
        ]
      };

      if (!whereConditions.AND) {
        whereConditions.AND = [];
      }
      whereConditions.AND.push(searchCondition);
    }

    let orderBy: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[] = { createdAt: 'desc' }; // default
    const sortOrderTyped = sortOrder as 'asc' | 'desc';
    switch (sortField) {
      case 'title':
        orderBy = { title: sortOrderTyped };
        break;
      case 'author':
        orderBy = { authors: sortOrderTyped };
        break;
      case 'publisher':
        orderBy = { publisher: sortOrderTyped };
        break;
      case 'publicationYear':
        orderBy = [{ publicationYear: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'language':
        orderBy = [{ language: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'doctype':
        orderBy = [{ doctype: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'numPages':
        orderBy = [{ numPages: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'favorite':
        orderBy = [{ favorite: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'updatedAt':
        orderBy = { updatedAt: sortOrderTyped };
        break;
      case 'filesize':
        orderBy = [{ filesize: sortOrderTyped }, { title: 'asc' }];
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sortOrderTyped };
        break;
    }

    const totalCount = await prisma.document.count({ where: whereConditions });

    const dbDocuments = await prisma.document.findMany({
      where: whereConditions,
      orderBy,
      skip: offset,
      take: limit,
    });

    const documents = dbDocuments.map(dbDoc => dbDocumentToLibraryDocument(dbDoc));

    const formatCountsResult = await prisma.document.groupBy({
      by: ['format'],
      where: whereConditions,
      _count: { format: true }
    });
    const formatCounts = Object.fromEntries(
      formatCountsResult.map(r => [r.format?.toUpperCase() || 'UNKNOWN', r._count.format])
    );

    const publisherCountsResult = await prisma.document.groupBy({
      by: ['publisher'],
      where: whereConditions,
      _count: { publisher: true }
    });
    const publisherCounts = Object.fromEntries(
      publisherCountsResult.filter(r => r.publisher).map(r => [r.publisher!, r._count.publisher])
    );

    const languageCountsResult = await prisma.document.groupBy({
      by: ['language'],
      where: whereConditions,
      _count: { language: true }
    });
    const languageCounts = Object.fromEntries(
      languageCountsResult.filter(r => r.language).map(r => [r.language!, r._count.language])
    );

    const keywordAuthorDocuments = await prisma.document.findMany({
      where: whereConditions,
      select: {
        keywords: true,
        authors: true,
      },
      take: 5000, // Limit to prevent excessive memory usage
    });

    const keywordCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};

    for (const doc of keywordAuthorDocuments) {
      if (doc.keywords) {
        try {
          const keywordArray = JSON.parse(doc.keywords as string) as string[];
          for (const kw of keywordArray) {
            const titleCaseKw = toProperTitleCase(kw);
            keywordCounts[titleCaseKw] = (keywordCounts[titleCaseKw] || 0) + 1;
          }
        } catch {
          continue;
        }
      }

      if (doc.authors) {
        try {
          const authorArray = JSON.parse(doc.authors as string) as string[];
          for (const author of authorArray) {
            const titleCaseAuthor = toProperTitleCase(author);
            authorCounts[titleCaseAuthor] = (authorCounts[titleCaseAuthor] || 0) + 1;
          }
        } catch {
          continue;
        }
      }
    }

    const filterOptions = {
      formats: formatCounts,
      keywords: keywordCounts,
      authors: authorCounts,
      publishers: publisherCounts,
      languages: languageCounts,
    };

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filterOptions
    });
  } catch (error) {
    console.error('Error in documents API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
