import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DocumentMetadata, LibraryCategory, LibraryDocument } from '@/lib/library';

const LIBRARY_DIR = path.join(process.cwd(), 'public', 'library');

function readMetadata(filePath: string): DocumentMetadata | null {
  const jsonPath = filePath.replace(/\.(pdf|epub|djvu|mobi)$/i, '.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading metadata for ${filePath}:`, error);
    }
  }
  return null;
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!fs.existsSync(LIBRARY_DIR)) {
      return NextResponse.json({ categories: [], documents: [] });
    }

    const documents: LibraryDocument[] = [];

    function scanDirectory(dirPath: string, relativePath: string[] = []) {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, [...relativePath, item]);
        } else if (item.match(/\.(pdf|epub|djvu|mobi)$/i)) {
          const metadata = readMetadata(fullPath);
          if (metadata) {
            const categoryPath = relativePath.slice(1); // Skip the doctype level
            documents.push({
              path: fullPath,
              filename: item,
              metadata,
              categoryPath,
              url: `/library/${relativePath.join('/')}/${item}`.replace(/\/+/g, '/')
            });
          }
        }
      }
    }

    scanDirectory(LIBRARY_DIR);

    if (category) {
      // Filter documents by category
      const filteredDocuments = documents.filter(doc =>
        doc.categoryPath.join(' > ').startsWith(category)
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
