import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = path.join(LIBRARY_DIR, filename);
    const metadataPath = filePath.replace(/\.(pdf|epub|djvu)$/i, '.json');

    // Delete from database first
    const deletedDocument = await prisma.document.deleteMany({
      where: { filename },
    });

    if (deletedDocument.count === 0) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    // Delete the physical file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the old metadata file if it exists (for backward compatibility)
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
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
