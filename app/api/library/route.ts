import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DocumentMetadata, LibraryCategory, LibraryDocument } from '@/lib/library';
import { Document } from '@prisma/client';

function buildCategoryTree(documents: LibraryDocument[]): LibraryCategory[] {
  const root: LibraryCategory = {
    name: 'All',
    path: [],
    children: [],
    documents: []
  };

  const categoryMap = new Map<string, LibraryCategory>();

  documents.forEach(doc => {
    const doctype = doc.metadata.doctype || 'Others';
    const categoryString = doc.metadata.category;
    if (!categoryString) return;

    // First level: doctype (Book, Article, Others)
    let currentPath: string[] = [doctype];
    let currentCategory = root;

    // Create or get doctype category
    const doctypeKey = doctype;
    if (!categoryMap.has(doctypeKey)) {
      const doctypeCategory: LibraryCategory = {
        name: doctype,
        path: [doctype],
        children: [],
        documents: []
      };
      categoryMap.set(doctypeKey, doctypeCategory);
      currentCategory.children.push(doctypeCategory);
    }
    currentCategory = categoryMap.get(doctypeKey)!;

    // Then build the category hierarchy under the doctype
    const categoryParts = categoryString.split('>').map(part => part.trim());

    categoryParts.forEach(part => {
      currentPath = [...currentPath, part];
      const pathKey = currentPath.join(' > ');

      if (!categoryMap.has(pathKey)) {
        const newCategory: LibraryCategory = {
          name: part,
          path: [...currentPath],
          children: [],
          documents: []
        };
        categoryMap.set(pathKey, newCategory);
        currentCategory.children.push(newCategory);
      }
      currentCategory = categoryMap.get(pathKey)!;
    });

    currentCategory.documents.push(doc);
  });

  return root.children;
}

function dbDocumentToLibraryDocument(dbDoc: Document): LibraryDocument {
  return {
    path: dbDoc.filePath,
    filename: dbDoc.filename,
    metadata: {
      doctype: dbDoc.doctype as 'Book' | 'Article' | 'Others',
      title: dbDoc.title,
      authors: JSON.parse(dbDoc.authors),
      publication_year: dbDoc.publicationYear || undefined,
      publisher: dbDoc.publisher || undefined,
      category: dbDoc.category,
      language: dbDoc.language || undefined,
      keywords: JSON.parse(dbDoc.keywords),
      abstract: dbDoc.abstract || undefined,
      favorite: dbDoc.favorite,
      metadata: dbDoc.metadata ? JSON.parse(dbDoc.metadata) : undefined,
    },
    categoryPath: [], // Will be computed from category string
    url: dbDoc.url,
    coverUrl: dbDoc.coverUrl || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Fetch all documents from database
    const dbDocuments = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const documents: LibraryDocument[] = dbDocuments.map(dbDocumentToLibraryDocument);

    if (category) {
      // Filter documents by category
      const filteredDocuments = documents.filter(doc =>
        doc.metadata.category.startsWith(category)
      );
      return NextResponse.json({ documents: filteredDocuments });
    } else {
      // Return categories and all documents
      const categories = buildCategoryTree(documents);
      return NextResponse.json({ categories, documents });
    }
  } catch (error) {
    console.error('Error in library API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
