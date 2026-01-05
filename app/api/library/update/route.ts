import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPrismaClient } from '@/lib/db';
import { getLibrary } from '@/lib/libraries';
import { LibraryDocument } from '@/lib/library';
import { Document } from '@prisma/client';

function dbDocumentToLibraryDocument(dbDoc: Document, library: string): LibraryDocument {
  const path = dbDoc.url.replace(`/api/library/${library}/file/`, '');
  return {
    path,
    filename: dbDoc.filename,
    metadata: {
      doctype: dbDoc.doctype as 'Book' | 'Article' | 'Others',
      title: dbDoc.title,
      authors: JSON.parse(dbDoc.authors),
      publication_year: dbDoc.publicationYear || undefined,
      publisher: dbDoc.publisher || undefined,
      category: dbDoc.category,
      language: dbDoc.language,
      keywords: JSON.parse(dbDoc.keywords),
      abstract: dbDoc.abstract,
      favorite: dbDoc.favorite,
      metadata: dbDoc.metadata ? JSON.parse(dbDoc.metadata) : undefined,
      updatedAt: dbDoc.updatedAt,
      numPages: dbDoc.numPages,
    },
    categoryPath: [], // Will be computed from category string
    url: dbDoc.url,
  };
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const library = searchParams.get('library') || 'default';

    const { filename, metadata } = await request.json();

    if (!filename || !metadata) {
      return NextResponse.json({ error: 'Filename and metadata are required' }, { status: 400 });
    }

    // Get library info
    const libraryInfo = getLibrary(library);
    if (!libraryInfo) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Get Prisma client for this library
    const prisma = getPrismaClient(libraryInfo.path);

    // Find the document
    const existingDoc = await prisma.document.findUnique({
      where: { filename }
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const oldCategory = existingDoc.category;
    const oldTitle = existingDoc.title;
    const newCategory = metadata.category;
    const newTitle = metadata.title;

    const updateData: Record<string, unknown> = {
      title: metadata.title,
      authors: JSON.stringify(metadata.authors || []),
      publicationYear: metadata.publication_year,
      publisher: metadata.publisher,
      category: metadata.category,
      language: metadata.language,
      keywords: JSON.stringify(metadata.keywords || []),
      abstract: metadata.abstract,
      doctype: metadata.doctype,
      metadata: metadata.metadata ? JSON.stringify(metadata.metadata) : null,
      updatedAt: new Date(),
    };

    if (oldCategory !== newCategory || oldTitle !== newTitle || existingDoc.doctype !== metadata.doctype) {
      // Need to rename and move files
      const fileExtension = path.extname(existingDoc.filename);

      const categoryParts = newCategory.split('>').map((part: string) => part.trim()).filter((part: string) => part);
      const folderPath = [metadata.doctype, ...categoryParts.slice(0, 2)].join('/'); // doctype + 2-level category folders
      const categoryDir = path.join(libraryInfo.path, folderPath);

      // Ensure category directory exists
      fs.mkdirSync(categoryDir, { recursive: true });

      // Generate new filename from title
      const safeTitle = newTitle.replace(/[\/\\?%*:|"<>]/g, '_');
      let newFilename = `${safeTitle}${fileExtension}`;

      // Ensure filename uniqueness
      let counter = 1;
      while (fs.existsSync(path.join(categoryDir, newFilename))) {
        newFilename = `${safeTitle}_${counter}${fileExtension}`;
        counter++;
      }

      // Derive old file path from url
      const oldUrlParts = existingDoc.url.split('/').slice(5); // Skip /api/library/library/file/
      const oldFileRelativePath = oldUrlParts.join('/');
      const oldFilePath = path.join(libraryInfo.path, oldFileRelativePath);

      const newFilePath = path.join(categoryDir, newFilename);
      const newUrl = `/api/library/${library}/file/${folderPath}/${newFilename}`.replace(/\/+/g, '/');

      // Move file to new location
      fs.renameSync(oldFilePath, newFilePath);

      // Move cover if exists (cover filename is based on original filename)
      const oldCoverFilename = `[Cover] ${existingDoc.filename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
      const oldCoverPath = path.join(path.dirname(oldFilePath), oldCoverFilename);
      const newCoverFilename = `[Cover] ${newFilename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
      const newCoverPath = path.join(categoryDir, newCoverFilename);
      if (fs.existsSync(oldCoverPath)) {
        fs.renameSync(oldCoverPath, newCoverPath);
      }

      // Update path-related fields
      updateData.filename = newFilename;
      updateData.url = newUrl;
    }

    // Update the document
    const updatedDoc = await prisma.document.update({
      where: { filename },
      data: updateData
    });

    const libraryDocument = dbDocumentToLibraryDocument(updatedDoc, library);
    return NextResponse.json({ success: true, document: libraryDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
