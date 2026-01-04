import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

export async function PUT(request: NextRequest) {
  try {
    const { filename, metadata } = await request.json();

    if (!filename || !metadata) {
      return NextResponse.json({ error: 'Filename and metadata are required' }, { status: 400 });
    }

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
      const categoryDir = path.join(LIBRARY_DIR, folderPath);

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
      const newUrl = `/library/${folderPath}/${newFilename}`.replace(/\/+/g, '/');

      // Move file to new location
      fs.renameSync(existingDoc.filePath, newFilePath);

      let newCoverUrl: string | null = null;
      if ((existingDoc as any).coverUrl) {
        // Compute old cover path
        const oldCoverPath = path.join(process.cwd(), 'public', (existingDoc as any).coverUrl);
        const newCoverFilename = `${newFilename.replace(fileExtension, '')}_cover.jpg`;
        const newCoverPath = path.join(categoryDir, newCoverFilename);
        fs.renameSync(oldCoverPath, newCoverPath);
        newCoverUrl = `/library/${folderPath}/${newCoverFilename}`.replace(/\/+/g, '/');
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
