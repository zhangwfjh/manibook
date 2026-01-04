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

    // Find the document first to get cover info and file path
    const document = await prisma.document.findUnique({
      where: { filename },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found in database' }, { status: 404 });
    }

    // Delete the cover file if it exists
    if ((document as any).coverUrl) {
      const coverPath = path.join(process.cwd(), 'public', (document as any).coverUrl);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }

    // Delete from database
    await prisma.document.delete({
      where: { filename },
    });

    // Delete the physical file
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
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
