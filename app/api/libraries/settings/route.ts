import { NextRequest, NextResponse } from 'next/server';
import { getDefaultLibrary, setDefaultLibrary } from '@/lib/library/server';

export async function GET() {
  try {
    const defaultLibrary = await getDefaultLibrary();
    return NextResponse.json({ defaultLibrary });
  } catch (error) {
    console.error('Error getting default library:', error);
    return NextResponse.json({ error: 'Failed to load default library' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { defaultLibrary } = await request.json();

    if (typeof defaultLibrary !== 'string') {
      return NextResponse.json({ error: 'defaultLibrary must be a string' }, { status: 400 });
    }

    await setDefaultLibrary(defaultLibrary);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting default library:', error);
    return NextResponse.json({ error: 'Failed to save default library' }, { status: 500 });
  }
}
