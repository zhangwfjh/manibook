import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPrismaClient } from '@/lib/db';
import { getLibrary } from '@/lib/libraries';

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

    const storageDir = path.join(libraryInfo.path, 'storage');

    let updateData: any = {
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

    if (oldCategory !== newCategory || oldTitle !== newTitle) {
      // Need to rename and move files
      const fileExtension = path.extname(existingDoc.filename);

      const categoryParts = newCategory.split('>').map((part: string) => part.trim()).filter((part: string) => part);
      const folderPath = categoryParts.slice(0, 2).join('/');
      const categoryDir = path.join(storageDir, folderPath);

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

      const newFilePath = path.join(categoryDir, newFilename);
      const newUrl = `/api/library/${library}/file/${folderPath}/${newFilename}`.replace(/\/+/g, '/');

      // Move file to new location
      fs.renameSync(existingDoc.filePath, newFilePath);

      let newCoverUrl: string | null = null;
      if (existingDoc.coverUrl) {
        // Extract old cover path from URL
        const oldUrlParts = existingDoc.coverUrl.split('/').slice(5); // Skip /api/library/default/file/
        const oldCoverRelativePath = oldUrlParts.join('/');
        const oldCoverPath = path.join(libraryInfo.path, 'storage', oldCoverRelativePath);

        const newCoverFilename = `${newFilename.replace(fileExtension, '')}_cover.jpg`;
        const newCoverPath = path.join(categoryDir, newCoverFilename);
        if (fs.existsSync(oldCoverPath)) {
          fs.renameSync(oldCoverPath, newCoverPath);
        }
        newCoverUrl = `/api/library/${library}/file/${folderPath}/${newCoverFilename}`.replace(/\/+/g, '/');
      }

      // Update path-related fields
      updateData.filename = newFilename;
      updateData.filePath = newFilePath;
      updateData.url = newUrl;
      updateData.coverUrl = newCoverUrl;
    }

    // Update the document
    const updatedDoc = await prisma.document.update({
      where: { filename },
      data: updateData
    });

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
