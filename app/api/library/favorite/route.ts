import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const favorite = searchParams.get('favorite') === 'true';

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const metadataPath = path.join(LIBRARY_DIR, filename.replace(/\.(pdf|epub|djvu|mobi)$/i, '.json'));

    // Check if metadata file exists
    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json({ error: 'Document metadata not found' }, { status: 404 });
    }

    // Read current metadata
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Update favorite status
    metadata.favorite = favorite;

    // Write updated metadata back to file
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

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
