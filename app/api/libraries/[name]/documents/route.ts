import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata, Library } from '@/lib/library';
import { extractMetadataFromFile } from '@/app/library/metadata';
import crypto from 'crypto';
import { loadLLMSettings } from '@/lib/library/llm-settings';
import { validateLibraryAccess, dbDocumentToLibraryDocument, getLibraryPrisma } from '@/lib/library/api-utils';

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

  const prisma = await getLibraryPrisma(libraryName);

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

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Max 200 per page
    const offset = (page - 1) * limit;

    // Filter parameters
    const category = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const formats = searchParams.get('formats')?.split(',').filter(Boolean) || [];
    const authors = searchParams.get('authors')?.split(',').filter(Boolean) || [];
    const publishers = searchParams.get('publishers')?.split(',').filter(Boolean) || [];
    const showFavoritesOnly = searchParams.get('favoritesOnly') === 'true';

    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt-desc';
    const [sortField, sortOrder] = sortBy.split('-');

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    // Build WHERE conditions for filtering
    type WhereCondition = Record<string, any>;
    type WhereConditions = {
      AND?: WhereCondition[];
      OR?: WhereCondition[];
      [key: string]: any;
    };
    const whereConditions: WhereConditions = {};

    // Category filtering
    if (category) {
      // Handle the new category structure: category includes doctype prefix
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

    // Keywords filtering (JSON array contains any of the selected keywords)
    if (keywords.length > 0) {
      whereConditions.OR = keywords.map(keyword => ({
        keywords: {
          contains: keyword
        }
      }));
    }

    // Format filtering
    if (formats.length > 0) {
      whereConditions.format = {
        in: formats.map(f => f.toLowerCase())
      };
    }

    // Authors filtering (JSON array contains any of the selected authors)
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

    // Publishers filtering
    if (publishers.length > 0) {
      whereConditions.publisher = {
        in: publishers
      };
    }

    // Favorites filtering
    if (showFavoritesOnly) {
      whereConditions.favorite = true;
    }

    // Search query filtering (full-text search across title, authors, keywords, publisher)
    if (searchQuery) {
      const searchCondition = {
        OR: [
          { title: { contains: searchQuery } },
          { authors: { contains: searchQuery } },
          { keywords: { contains: searchQuery } },
          { publisher: { contains: searchQuery } },
        ]
      };

      // Always combine search with other conditions using AND
      if (!whereConditions.AND) {
        whereConditions.AND = [];
      }
      whereConditions.AND.push(searchCondition);
    }

    // Build ORDER BY clause
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

    // Get total count for pagination
    const totalCount = await prisma.document.count({ where: whereConditions });

    // Fetch paginated documents from database
    const dbDocuments = await prisma.document.findMany({
      where: whereConditions,
      orderBy,
      skip: offset,
      take: limit,
    });

    // Fetch ALL matching documents for filter aggregation
    const allDbDocuments = await prisma.document.findMany({
      where: whereConditions,
      select: {
        format: true,
        keywords: true,
        authors: true,
        publisher: true,
      },
    });

    const documents = dbDocuments.map(dbDoc => dbDocumentToLibraryDocument(dbDoc, name));

    const formatCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};
    const authorCounts: Record<string, number> = {};
    const publisherCounts: Record<string, number> = {};

    for (const doc of allDbDocuments) {
      if (doc.format) {
        const format = doc.format.toUpperCase();
        formatCounts[format] = (formatCounts[format] || 0) + 1;
      }

      if (doc.keywords) {
        try {
          const keywordArray = JSON.parse(doc.keywords as string) as string[];
          for (const kw of keywordArray) {
            const titleCaseKw = kw.replace(/\b\w/g, (l: string) => l.toUpperCase());
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
            const titleCaseAuthor = author.replace(/\b\w/g, (l: string) => l.toUpperCase());
            authorCounts[titleCaseAuthor] = (authorCounts[titleCaseAuthor] || 0) + 1;
          }
        } catch {
          continue;
        }
      }

      if (doc.publisher) {
        publisherCounts[doc.publisher] = (publisherCounts[doc.publisher] || 0) + 1;
      }
    }

    const filterOptions = {
      formats: formatCounts,
      keywords: keywordCounts,
      authors: authorCounts,
      publishers: publisherCounts,
    };

    // Calculate pagination info
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
    const validation = await validateLibraryAccess(name);
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
