import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata } from '@/lib/library';
import { extractMetadataFromFile } from '@/app/library/metadata';
import { prisma } from '@/lib/db';
import { computeSHA256 } from '@/lib/utils';
import { loadLLMSettings } from '@/lib/llm-settings';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

export async function POST(request: NextRequest) {
  try {
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

    // Check if file already exists
    const existingDoc = await prisma.document.findFirst({
      where: { hash }
    });
    if (existingDoc) {
      return NextResponse.json({ error: 'File already exists' }, { status: 400 });
    }

    // Save file temporarily
    const tempFilename = `temp_${Date.now()}${fileExtension}`;
    const tempFilePath = path.join(LIBRARY_DIR, tempFilename);
    fs.writeFileSync(tempFilePath, buffer);

    // Generate AI-powered metadata
    let metadata: DocumentMetadata;
    let coverUrl: string | undefined;
    let cover: Uint8Array | null = null;
    try {
      // Use AI extraction for supported formats
      const result = await extractMetadataFromFile(tempFilePath, llmSettings);
      const { metadata: extractedMetadata } = result;
      cover = result.cover;
      const doctype = (extractedMetadata.doctype as string);
      const validDoctypes = ['Book', 'Article', 'Others'];
      metadata = {
        doctype: (validDoctypes.includes(doctype) ? doctype : 'Book') as 'Book' | 'Article' | 'Others',
        title: (extractedMetadata.title as string) || path.parse(file.name).name,
        authors: Array.isArray(extractedMetadata.authors) ? extractedMetadata.authors as string[] : ['Unknown'],
        publication_year: extractedMetadata.publication_year as number,
        publisher: extractedMetadata.publisher as string,
        category: (Array.isArray(extractedMetadata.category) ? extractedMetadata.category[0] : extractedMetadata.category) as string,
        language: (extractedMetadata.language as string) || 'Unknown',
        keywords: Array.isArray(extractedMetadata.keywords) ? extractedMetadata.keywords as string[] : [],
        abstract: extractedMetadata.abstract as string,
        metadata: extractedMetadata.metadata as Record<string, unknown>,
      };

    } catch (error) {
      console.warn('Error extracting metadata, using basic metadata:', error);
      // Fallback to basic metadata
      metadata = {
        doctype: 'Book',
        title: path.parse(file.name).name,
        authors: ['Unknown'],
        category: 'Others',
        language: 'Unknown',
      };
    }

    // Parse category for folder structure
    const categoryParts = metadata.category.split('>').map(part => part.trim()).filter(part => part);
    const folderPath = categoryParts.slice(0, 2).join('/'); // 2-level folders
    const categoryDir = path.join(LIBRARY_DIR, folderPath);

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
    const filePath = path.join(categoryDir, newFilename);
    fs.renameSync(tempFilePath, filePath);

    // Save cover image if available (now that we have the final filename and directory)
    if (cover) {
      const coverFilename = `${newFilename.replace(/\.(pdf|epub|djvu)$/i, '')}_cover.jpg`;
      const coverPath = path.join(categoryDir, coverFilename);
      fs.writeFileSync(coverPath, cover);
      coverUrl = `/library/${folderPath}/${coverFilename}`.replace(/\/+/g, '/');
    }

    // Save to database
    const url = `/library/${folderPath}/${newFilename}`.replace(/\/+/g, '/');
    await prisma.document.create({
      data: {
        filename: newFilename,
        filePath,
        url,
        coverUrl,
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
