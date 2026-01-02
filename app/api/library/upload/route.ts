import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata } from '@/lib/library';
import { extractMetadataFromFile } from '@/app/library/metadata';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook', 'image/vnd.djvu'];
    const allowedExtensions = ['.pdf', '.epub', '.mobi', '.djvu'];

    const fileExtension = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Generate filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newFilename = `${timestamp}_${safeName}`;

    // Save file to library directory
    const filePath = path.join(LIBRARY_DIR, newFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Generate AI-powered metadata
    let metadata: DocumentMetadata;
    try {
      if (fileExtension !== '.mobi') {
        // Use AI extraction for supported formats
        const extractedMetadata = await extractMetadataFromFile(filePath);
        const doctype = (extractedMetadata.doctype as string);
        const validDoctypes = ['Book', 'Article', 'Others'];
        metadata = {
          doctype: (validDoctypes.includes(doctype) ? doctype : 'Book') as 'Book' | 'Article' | 'Others',
          title: (extractedMetadata.title as string) || path.parse(file.name).name,
          authors: Array.isArray(extractedMetadata.authors) ? extractedMetadata.authors as string[] : ['Unknown'],
          publication_year: extractedMetadata.publication_year as number,
          publisher: extractedMetadata.publisher as string,
          category: (extractedMetadata.category as string) || 'Others',
          language: (extractedMetadata.language as string) || 'Unknown',
          keywords: Array.isArray(extractedMetadata.keywords) ? extractedMetadata.keywords as string[] : [],
          abstract: extractedMetadata.abstract as string,
          metadata: extractedMetadata.metadata as Record<string, unknown>,
        };
      } else {
        // Basic metadata for MOBI files (not supported by AI extraction)
        metadata = {
          doctype: 'Book',
          title: path.parse(file.name).name,
          authors: ['Unknown'],
          category: 'Others',
          language: 'Unknown',
        };
      }
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

    // Save metadata
    const metadataPath = filePath.replace(/\.(pdf|epub|djvu|mobi)$/i, '.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

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
