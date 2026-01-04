import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/db';
import { getLibrary } from '@/lib/libraries';

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const favorite = searchParams.get('favorite') === 'true';
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
      favorite: favorite,
      message: `Document ${favorite ? 'added to' : 'removed from'} favorites`
    });

  } catch (error) {
    console.error('Error updating favorite status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
