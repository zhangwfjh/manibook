import { Document } from '@prisma/client';
import { LibraryDocument, LibraryCategory, getLibrary } from './index';
import { getPrismaClient } from '../db';

export function dbDocumentToLibraryDocument(dbDoc: Document, library: string): LibraryDocument {
  const path = dbDoc.url.replace(`/api/libraries/${library}/files/`, '');
  return {
    path,
    filename: dbDoc.filename,
    metadata: {
      doctype: dbDoc.doctype as 'Book' | 'Article' | 'Others',
      title: dbDoc.title,
      authors: JSON.parse(dbDoc.authors),
      publication_year: dbDoc.publicationYear || undefined,
      publisher: dbDoc.publisher || undefined,
      category: dbDoc.category,
      language: dbDoc.language,
      keywords: JSON.parse(dbDoc.keywords),
      abstract: dbDoc.abstract,
      favorite: dbDoc.favorite,
      metadata: dbDoc.metadata ? JSON.parse(dbDoc.metadata) : undefined,
      updatedAt: dbDoc.updatedAt,
      numPages: dbDoc.numPages,
    },
    categoryPath: [], // Will be computed from category string
    url: dbDoc.url.replace('/api/library/', '/api/libraries/'), // Update URL to new structure
  };
}

export function buildCategoryTree(documents: LibraryDocument[]): LibraryCategory[] {
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

export function validateLibraryAccess(libraryName: string) {
  const libraryInfo = getLibrary(libraryName);
  if (!libraryInfo) {
    return { error: 'Library not found', status: 404 };
  }
  return { libraryInfo };
}

export function getLibraryPrisma(libraryName: string) {
  const validation = validateLibraryAccess(libraryName);
  if (validation.error) {
    throw new Error(validation.error);
  }
  return getPrismaClient(validation.libraryInfo!.path);
}
