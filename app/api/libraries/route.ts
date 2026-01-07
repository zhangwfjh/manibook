import { NextRequest, NextResponse } from 'next/server';
import { readLibraries, addLibrary, ensureLibraryStructure } from '@/lib/library';

export async function GET() {
  try {
    const libraries = await readLibraries();
    return NextResponse.json({ libraries });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, path: libraryPath } = await request.json();

    if (!name || !libraryPath) {
      return NextResponse.json({ error: 'Name and path are required' }, { status: 400 });
    }

    // Validate path (basic check)
    if (!libraryPath.startsWith('/') && !libraryPath.match(/^[A-Za-z]:/)) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }

    // Try to create the library structure
    try {
      await ensureLibraryStructure(libraryPath);
    } catch (error) {
      console.error('Error creating library structure:', error);
      return NextResponse.json({ error: 'Failed to create library directory' }, { status: 500 });
    }

    // Add to registry
    const success = addLibrary(name, libraryPath);
    if (!success) {
      return NextResponse.json({ error: 'Library name already exists' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Library created successfully' });
  } catch (error) {
    console.error('Error creating library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
