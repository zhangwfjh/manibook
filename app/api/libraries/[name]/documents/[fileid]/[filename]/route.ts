import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateLibraryAccess, getLibraryPrisma } from '@/lib/library/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string; filename: string }> }
) {
  try {
    const { name, fileid } = await params;

    // Validate library access
    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    // Get document from database
    const prisma = await getLibraryPrisma(name);
    const dbDoc = await prisma.document.findUnique({
      where: { id: fileid }
    });

    if (!dbDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Construct file path from document URL
    const filePath = path.join(libraryInfo.path, dbDoc.url.substring(6)); // Remove 'lib://' prefix

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file and determine content type
    const stat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.epub': 'application/epub+zip',
    '.djvu': 'image/vnd.djvu',
    '.txt': 'text/plain',
  };

  return contentTypes[ext] || 'application/octet-stream';
}