import { NextRequest, NextResponse } from 'next/server';
import { validateLibraryAccess, getLibraryPrisma } from '@/lib/library/api-utils';

// Placeholder SVG for documents without covers
const PLACEHOLDER_SVG = `<svg width="150" height="200" viewBox="0 0 150 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="150" height="200" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
  <rect x="20" y="30" width="110" height="140" fill="#ffffff" stroke="#d1d5db" stroke-width="0.5"/>
  <text x="75" y="110" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af">No Cover</text>
  <rect x="30" y="40" width="90" height="4" fill="#e5e7eb"/>
  <rect x="30" y="50" width="70" height="4" fill="#e5e7eb"/>
  <rect x="30" y="60" width="85" height="4" fill="#e5e7eb"/>
  <rect x="30" y="150" width="60" height="3" fill="#d1d5db"/>
  <rect x="30" y="158" width="45" height="3" fill="#d1d5db"/>
</svg>`;

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

    if (!dbDoc.cover) {
      // Return placeholder SVG for documents without covers
      return new NextResponse(PLACEHOLDER_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Length': PLACEHOLDER_SVG.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    const coverBuffer = Buffer.from(dbDoc.cover);

    return new NextResponse(Uint8Array.from(coverBuffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': coverBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving cover:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
