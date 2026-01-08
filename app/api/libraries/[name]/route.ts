import { NextRequest, NextResponse } from 'next/server';
import { getLibrary, renameLibrary, archiveLibrary } from '@/lib/library';

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
      // Could add more metadata like creation date, document count, etc.
    });
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const { newName } = await request.json();

    if (!newName) {
      return NextResponse.json({ error: 'newName is required' }, { status: 400 });
    }

    // Rename library
    const success = await renameLibrary(name, newName);
    if (!success) {
      return NextResponse.json({ error: 'Library not found or new name already exists' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Library renamed successfully' });
  } catch (error) {
    console.error('Error renaming library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Archive library
    const success = await archiveLibrary(name);
    if (!success) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Library archived successfully' });
  } catch (error) {
    console.error('Error archiving library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
