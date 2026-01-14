import { NextRequest, NextResponse } from 'next/server';
import { getLibrary, renameLibrary, moveLibrary, archiveLibrary } from '@/lib/library/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const libraryInfo = await getLibrary(name);

    if (!libraryInfo) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: libraryInfo.name,
      path: libraryInfo.path,
    });
  } catch (error) {
    console.error('Error fetching library:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { newName, newPath } = await request.json();

    if (!newName && !newPath) {
      return NextResponse.json({ error: 'Either newName or newPath is required' }, { status: 400 });
    }

    // Handle rename only
    if (newName && !newPath) {
      const success = await renameLibrary(name, newName);
      if (!success) {
        return NextResponse.json({ error: 'Library not found or new name already exists' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Library renamed successfully' });
    }

    // Handle move only
    if (newPath && !newName) {
      const success = await moveLibrary(name, newPath);
      if (!success) {
        return NextResponse.json({ error: 'Failed to move library' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Library moved successfully' });
    }

    // Handle both rename and move
    const renameSuccess = await renameLibrary(name, newName);
    if (!renameSuccess) {
      return NextResponse.json({ error: 'Failed to rename library' }, { status: 400 });
    }

    const moveSuccess = await moveLibrary(newName, newPath);
    if (!moveSuccess) {
      return NextResponse.json({ error: 'Failed to move library' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Library renamed and moved successfully' });
  } catch (error) {
    console.error('Error updating library:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    const success = await archiveLibrary(name);
    if (!success) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Library archived successfully' });
  } catch (error) {
    console.error('Error archiving library:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
