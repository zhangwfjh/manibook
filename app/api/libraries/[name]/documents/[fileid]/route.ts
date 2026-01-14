import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateLibraryAccess, dbDocumentToLibraryDocument, getLibraryPrisma, normalizeMetadata } from '@/lib/library/utils';
import { DocumentMetadata } from '@/lib/library';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string }> }
) {
  try {
    const { name, fileid } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const prisma = await getLibraryPrisma(name);

    const dbDoc = await prisma.document.findUnique({
      where: { id: fileid }
    });

    if (!dbDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = dbDocumentToLibraryDocument(dbDoc);
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string }> }
) {
  try {
    const { name, fileid } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const { metadata } = await request.json();

    if (!metadata) {
      return NextResponse.json({ error: 'Metadata is required' }, { status: 400 });
    }

    const normalizedMetadata = normalizeMetadata(metadata as DocumentMetadata);

    const prisma = await getLibraryPrisma(name);

    const existingDoc = await prisma.document.findUnique({
      where: { id: fileid }
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const oldCategory = existingDoc.category;
    const oldTitle = existingDoc.title;
    const newCategory = normalizedMetadata.category as string;
    const newTitle = normalizedMetadata.title as string;

    const updateData: Record<string, unknown> = {
      title: normalizedMetadata.title,
      authors: JSON.stringify(normalizedMetadata.authors || []),
      publicationYear: metadata.publication_year,
      publisher: normalizedMetadata.publisher,
      category: normalizedMetadata.category,
      language: normalizedMetadata.language,
      keywords: JSON.stringify(normalizedMetadata.keywords || []),
      abstract: normalizedMetadata.abstract,
      doctype: normalizedMetadata.doctype,
      metadata: normalizedMetadata.metadata ? JSON.stringify(normalizedMetadata.metadata) : null,
      updatedAt: new Date(),
    };

    if (oldCategory !== newCategory || oldTitle !== newTitle || existingDoc.doctype !== metadata.doctype) {
      const fileExtension = path.extname(existingDoc.filename);

      const categoryParts = newCategory.split(' > ').map((part: string) => part.trim()).filter((part: string) => part);
      const folderPath = [normalizedMetadata.doctype, ...categoryParts.slice(0, 2)].join('/');
      const categoryDir = path.join(libraryInfo.path, folderPath);
      fs.mkdirSync(categoryDir, { recursive: true });
      const safeTitle = newTitle.replace(/[\/\\?%*:|"<>]/g, '_');
      let newFilename = `${safeTitle}${fileExtension}`;
      let counter = 1;
      while (fs.existsSync(path.join(categoryDir, newFilename))) {
        newFilename = `${safeTitle}_${counter}${fileExtension}`;
        counter++;
      }

      const oldFilePath = path.join(libraryInfo.path, existingDoc.url.substring(6));
      const newFilePath = path.join(categoryDir, newFilename);
      const newUrl = `lib://` + `${folderPath}/${newFilename}`.replace(/\/+/g, '/');
      fs.renameSync(oldFilePath, newFilePath);

      updateData.filename = newFilename;
      updateData.url = newUrl;
    }

    const updatedDoc = await prisma.document.update({
      where: { id: existingDoc.id },
      data: updateData
    });

    const libraryDocument = dbDocumentToLibraryDocument(updatedDoc);
    return NextResponse.json({ success: true, document: libraryDocument });
  } catch (error) {
    console.error('Error updating document:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string }> }
) {
  try {
    const { name, fileid } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { favorite } = await request.json();

    if (typeof favorite !== 'boolean') {
      return NextResponse.json({ error: 'Favorite must be a boolean' }, { status: 400 });
    }

    const prisma = await getLibraryPrisma(name);

    await prisma.document.update({
      where: { id: fileid },
      data: { favorite },
    });

    return NextResponse.json({
      success: true,
      favorite,
      message: `Document ${favorite ? 'added to' : 'removed from'} favorites`
    });

  } catch (error) {
    console.error('Error updating favorite status:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string }> }
) {
  try {
    const { name, fileid } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const prisma = await getLibraryPrisma(name);

    const document = await prisma.document.findUnique({
      where: { id: fileid },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    const filePath = path.join(libraryInfo.path, document.url.substring(6));
    await prisma.document.delete({
      where: { id: document.id },
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
