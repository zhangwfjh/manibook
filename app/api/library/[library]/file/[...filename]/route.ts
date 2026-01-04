import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getLibrary } from '@/lib/libraries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ library: string; filename: string[] }> }
) {
  try {
    const { library, filename } = await params;
    const filenamePath = filename.join('/');

    // Get library info
    const libraryInfo = getLibrary(library);
    if (!libraryInfo) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Construct file path
    const filePath = path.join(libraryInfo.path, filenamePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Get file stats
    const stat = fs.statSync(filePath);

    // Read file
    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.epub': 'application/epub+zip',
    '.djvu': 'image/vnd.djvu',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
  };

  return contentTypes[ext] || 'application/octet-stream';
}
