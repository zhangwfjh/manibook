import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata } from '@/lib/library';
import { extractMetadataFromFile } from '@/app/library/metadata';
import { computeSHA256 } from '@/lib/utils';
import { loadLLMSettings } from '@/lib/llm-settings';
import { validateLibraryAccess, dbDocumentToLibraryDocument, buildCategoryTree, getLibraryPrisma } from '@/lib/api-utils';

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

    // Load LLM settings from server
    const llmSettings = loadLLMSettings();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = ['.pdf', '.epub', '.djvu'];
    const fileExtension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Compute SHA256 hash
    const hash = computeSHA256(buffer);

    const prisma = getLibraryPrisma(name);

    // Check if file already exists
    const existingDoc = await prisma.document.findFirst({
      where: { hash }
    });
    if (existingDoc) {
      return NextResponse.json({ error: 'File already exists' }, { status: 400 });
    }

    // Use library root directory
    const libraryDir = libraryInfo.path;

    // Save file temporarily
    const tempFilename = `temp_${Date.now()}${fileExtension}`;
    const tempFilePath = path.join(libraryDir, tempFilename);
    fs.writeFileSync(tempFilePath, buffer);

    // Generate AI-powered metadata
    let metadata: DocumentMetadata;
    let cover: Uint8Array | null = null;
    let numPages = 0;
    try {
      // Use AI extraction for supported formats
      const result = await extractMetadataFromFile(tempFilePath, llmSettings);
      const { metadata: extractedMetadata, cover: extractedCover, numPages: extractedNumPages } = result;
      cover = extractedCover;
      numPages = extractedNumPages;
      const doctype = (extractedMetadata.doctype as string);
      const validDoctypes = ['Article', 'Book', 'Others'];
      metadata = {
        doctype: (validDoctypes.includes(doctype) ? doctype : 'Book') as 'Article' | 'Book' | 'Others',
        title: (extractedMetadata.title as string) || path.parse(file.name).name,
        authors: Array.isArray(extractedMetadata.authors) ? extractedMetadata.authors as string[] : ['Unknown'],
        publication_year: extractedMetadata.publication_year as number || undefined,
        publisher: extractedMetadata.publisher as string || undefined,
        category: (Array.isArray(extractedMetadata.category) ? extractedMetadata.category[0] : extractedMetadata.category) as string || 'Others',
        language: (extractedMetadata.language as string) || 'Unknown',
        keywords: Array.isArray(extractedMetadata.keywords) ? extractedMetadata.keywords as string[] : [],
        abstract: extractedMetadata.abstract as string || '',
        metadata: extractedMetadata.metadata as Record<string, unknown> || undefined,
        favorite: false,
        numPages: extractedNumPages || 0,
      };

    } catch (error) {
      return NextResponse.json({ error: 'File parse failed' }, { status: 400 });
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

    // Move file to final location
    const finalFilePath = path.join(categoryDir, newFilename);
    fs.renameSync(tempFilePath, finalFilePath);

    // Save cover image if available (now that we have the final filename and directory)
    if (cover) {
      const coverFilename = `[Cover] ${newFilename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
      const coverPath = path.join(categoryDir, coverFilename);
      fs.writeFileSync(coverPath, cover);
    }

    // Save to database
    const url = `/api/libraries/${name}/files/${folderPath}/${newFilename}`.replace(/\/+/g, '/');
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
      },
    });

    return NextResponse.json({
      success: true,
      filename: newFilename,
      metadata
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
