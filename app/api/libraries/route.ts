import { NextRequest, NextResponse } from 'next/server';
import { readLibraries, addLibrary, ensureLibraryStructure, archiveLibrary, renameLibrary } from '@/lib/libraries';

export async function GET() {
  try {
    const libraries = readLibraries();
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const libraryName = searchParams.get('name');

    if (!libraryName) {
      return NextResponse.json({ error: 'Library name is required' }, { status: 400 });
    }

    // Remove from registry
    const success = archiveLibrary(libraryName);
    if (!success) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Library archived successfully' });
  } catch (error) {
    console.error('Error archiving library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const oldName = searchParams.get('oldName');
    const newName = searchParams.get('newName');

    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Both oldName and newName are required' }, { status: 400 });
    }

    // Rename library
    const success = renameLibrary(oldName, newName);
    if (!success) {
      return NextResponse.json({ error: 'Library not found or new name already exists' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Library renamed successfully' });
  } catch (error) {
    console.error('Error renaming library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
