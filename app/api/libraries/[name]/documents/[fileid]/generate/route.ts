import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateLibraryAccess, getLibraryPrisma } from '@/lib/library/utils';
import { extractMetadataFromFile } from '@/lib/library/documents/metadata-extractor';
import { loadLLMSettings } from '@/lib/library/settings/llm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; fileid: string }> }
) {
  try {
    const { name, fileid } = await params;

    const validation = await validateLibraryAccess(name);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const libraryInfo = validation.libraryInfo!;

    const prisma = await getLibraryPrisma(name);

    const dbDoc = await prisma.document.findUnique({
      where: { id: fileid }
    });

    if (!dbDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const filePath = path.join(libraryInfo.path, dbDoc.url.substring(6));

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Document file not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(dbDoc.filename).slice(1);
    const llmSettings = loadLLMSettings();

    const { metadata } = await extractMetadataFromFile(
      buffer,
      fileExtension,
      llmSettings
    );

    return NextResponse.json({ metadata: metadata });
  } catch (error) {
    console.error('Error generating metadata:', error);
    return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
  }
}
