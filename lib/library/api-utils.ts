import { Document } from '../generated/prisma/client';
import { LibraryDocument, LibraryCategory, getLibrary } from './index';
import { getPrismaClient } from '../db';

export function dbDocumentToLibraryDocument(dbDoc: Document, library: string): LibraryDocument {
  const path = dbDoc.url.startsWith('lib://') ? dbDoc.url.substring(6) : dbDoc.url.replace(`/api/libraries/${library}/files/`, '');
  return {
    path,
    filename: dbDoc.filename,
    metadata: {
      doctype: dbDoc.doctype as 'Article' | 'Book' | 'Others',
      title: dbDoc.title,
      authors: JSON.parse(dbDoc.authors),
      publicationYear: dbDoc.publicationYear || undefined,
      publisher: dbDoc.publisher || undefined,
      category: dbDoc.category,
      language: dbDoc.language,
      keywords: JSON.parse(dbDoc.keywords),
      abstract: dbDoc.abstract,
      favorite: dbDoc.favorite,
      metadata: dbDoc.metadata ? JSON.parse(dbDoc.metadata) : undefined,
      updatedAt: dbDoc.updatedAt,
      numPages: dbDoc.numPages,
      filesize: Number(dbDoc.filesize),
      format: dbDoc.format,
    },
    categoryPath: [], // Will be computed from category string
    url: dbDoc.url,
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

    // First level: doctype (Article, Book, Others)
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

export async function validateLibraryAccess(libraryName: string) {
  const libraryInfo = await getLibrary(libraryName);
  if (!libraryInfo) {
    return { error: 'Library not found', status: 404 };
  }
  return { libraryInfo };
}

export function buildCategoryTreeFromAggregatedData(categoryData: Array<{
  doctype: string;
  category: string;
  count: number;
}>): LibraryCategory[] {
  const root: LibraryCategory = {
    name: 'All',
    path: [],
    children: [],
    documents: []
  };

  const categoryMap = new Map<string, LibraryCategory>();

  categoryData.forEach(({ doctype, category, count }) => {
    // First level: doctype (Article, Book, Others)
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
    const categoryParts = category.split('>').map(part => part.trim());

    categoryParts.forEach((part, index) => {
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

      // Add count to the deepest category level
      if (index === categoryParts.length - 1) {
        // Create dummy documents to represent the count
        currentCategory.documents = Array(count).fill(null);
      }
    });
  });

  return root.children;
}

export async function getLibraryPrisma(libraryName: string) {
  const validation = await validateLibraryAccess(libraryName);
  if (validation.error) {
    throw new Error(validation.error);
  }
  return getPrismaClient(validation.libraryInfo!.path);
}
