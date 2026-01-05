import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPrismaClient } from '@/lib/db';
import { getLibrary } from '@/lib/libraries';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const library = searchParams.get('library') || 'default';

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    // Get library info
    const libraryInfo = getLibrary(library);
    if (!libraryInfo) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Get Prisma client for this library
    const prisma = getPrismaClient(libraryInfo.path);

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Find the document first to get cover info and file path
    const document = await prisma.document.findUnique({
      where: { filename },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    // Derive file path from url
    const urlParts = document.url.split('/').slice(5); // Skip /api/library/library/file/
    const fileRelativePath = urlParts.join('/');
    const filePath = path.join(libraryInfo.path, fileRelativePath);

    // Delete the cover file if it exists
    const coverFilename = `${document.filename.replace(/\.(pdf|epub|djvu)$/i, '')}_cover.jpg`;
    const coverPath = path.join(path.dirname(filePath), coverFilename);
    if (fs.existsSync(coverPath)) {
      fs.unlinkSync(coverPath);
    }

    // Delete from database
    await prisma.document.delete({
      where: { filename },
    });

    // Delete the physical file
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
