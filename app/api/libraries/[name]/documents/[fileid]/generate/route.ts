import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { validateLibraryAccess, getLibraryPrisma } from '@/lib/library/api-utils';
import { extractMetadataFromFile } from '@/lib/library/metadata';
import { loadLLMSettings } from '@/lib/library/llm-settings';
import { normalizeMetadata } from '@/lib/library/document-utils';

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

    const { metadata: extractedMetadata } = await extractMetadataFromFile(
      buffer,
      fileExtension,
      llmSettings
    );

    const metadataToSave = normalizeMetadata({
      title: extractedMetadata.title || dbDoc.title,
      authors: extractedMetadata.authors || JSON.parse(dbDoc.authors),
      publication_year: extractedMetadata.publicationYear || dbDoc.publicationYear || undefined,
      publisher: extractedMetadata.publisher || dbDoc.publisher || undefined,
      category: extractedMetadata.category || dbDoc.category,
      language: extractedMetadata.language || dbDoc.language,
      keywords: extractedMetadata.keywords || [],
      abstract: extractedMetadata.abstract || '',
      doctype: extractedMetadata.doctype || dbDoc.doctype,
      metadata: extractedMetadata.metadata || (dbDoc.metadata ? JSON.parse(dbDoc.metadata) : undefined),
    });

    return NextResponse.json({ metadata: metadataToSave });
  } catch (error) {
    console.error('Error generating metadata:', error);
    return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
  }
}
