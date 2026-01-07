import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateLibraryAccess, dbDocumentToLibraryDocument, getLibraryPrisma } from '@/lib/library/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  try {
    const { name, filename: encodedFilename } = await params;
    const filename = decodeURIComponent(encodedFilename);

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    // Find the document
    const dbDoc = await prisma.document.findUnique({
      where: { filename }
    });

    if (!dbDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = dbDocumentToLibraryDocument(dbDoc, name);
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  try {
    const { name, filename: encodedFilename } = await params;
    const filename = decodeURIComponent(encodedFilename);

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const { metadata } = await request.json();

    if (!metadata) {
      return NextResponse.json({ error: 'Metadata is required' }, { status: 400 });
    }

    const prisma = await getLibraryPrisma(name);

    // Find the existing document
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
      fs.mkdirSync(categoryDir, { recursive: true });
      const safeTitle = newTitle.replace(/[\/\\?%*:|"<>]/g, '_');
      let newFilename = `${safeTitle}${fileExtension}`;
      let counter = 1;
      while (fs.existsSync(path.join(categoryDir, newFilename))) {
        newFilename = `${safeTitle}_${counter}${fileExtension}`;
        counter++;
      }

      const oldFilePath = path.join(libraryInfo.path, existingDoc.url.substring(6));  // Skip lib://
      const newFilePath = path.join(categoryDir, newFilename);
      const newUrl = `lib://` + `${folderPath}/${newFilename}`.replace(/\/+/g, '/');
      fs.renameSync(oldFilePath, newFilePath);
      const oldCoverFilename = `[Cover] ${existingDoc.filename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
      const oldCoverPath = path.join(path.dirname(oldFilePath), oldCoverFilename);
      const newCoverFilename = `[Cover] ${newFilename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
      const newCoverPath = path.join(categoryDir, newCoverFilename);
      fs.renameSync(oldCoverPath, newCoverPath);

      // Update path-related fields
      updateData.filename = newFilename;
      updateData.url = newUrl;
    }

    // Update the document
    const updatedDoc = await prisma.document.update({
      where: { filename },
      data: updateData
    });

    const libraryDocument = dbDocumentToLibraryDocument(updatedDoc, name);
    return NextResponse.json({ success: true, document: libraryDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  try {
    const { name, filename: encodedFilename } = await params;
    const filename = decodeURIComponent(encodedFilename);

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { favorite } = await request.json();

    if (typeof favorite !== 'boolean') {
      return NextResponse.json({ error: 'Favorite must be a boolean' }, { status: 400 });
    }

    const prisma = await getLibraryPrisma(name);

    // Update favorite status in database
    const updatedDocument = await prisma.document.updateMany({
      where: { filename },
      data: { favorite },
    });

    if (updatedDocument.count === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      favorite,
      message: `Document ${favorite ? 'added to' : 'removed from'} favorites`
    });

  } catch (error) {
    console.error('Error updating favorite status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; filename: string }> }
) {
  try {
    const { name, filename: encodedFilename } = await params;
    const filename = decodeURIComponent(encodedFilename);

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const prisma = await getLibraryPrisma(name);

    // Find the document first to get cover info and file path
    const document = await prisma.document.findUnique({
      where: { filename },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    const filePath = path.join(libraryInfo.path, document.url.substring(6)); // Skip lib://
    const coverFilename = `[Cover] ${document.filename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
    const coverPath = path.join(path.dirname(filePath), coverFilename);
    if (fs.existsSync(coverPath)) {
      fs.unlinkSync(coverPath);
    }
    await prisma.document.delete({
      where: { filename },
    });
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
