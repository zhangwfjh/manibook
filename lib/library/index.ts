import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export interface DocumentMetadata {
  doctype: 'Article' | 'Book' | 'Others';
  title: string;
  authors: string[];
  publication_year?: number;
  publisher?: string;
  category: string;
  language: string;
  keywords: string[];
  abstract: string;
  favorite: boolean;
  numPages: number;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

export interface LibraryDocument {
  path: string;
  filename: string;
  metadata: DocumentMetadata;
  categoryPath: string[];
  url: string;
}

export interface LibraryCategory {
  name: string;
  path: string[];
  children: LibraryCategory[];
  documents: LibraryDocument[];
}

export interface Library {
  name: string;
  path: string; // Full path to library directory
}

const LIBRARIES_FILE = path.join(process.cwd(), 'libraries.json');

export function readLibraries(): Library[] {
  try {
    if (!fs.existsSync(LIBRARIES_FILE)) {
      return [];
    }
    const data = fs.readFileSync(LIBRARIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading libraries:', error);
    return [];
  }
}

export function writeLibraries(libraries: Library[]): void {
  try {
    fs.writeFileSync(LIBRARIES_FILE, JSON.stringify(libraries, null, 2));
  } catch (error) {
    console.error('Error writing libraries:', error);
  }
}

export function addLibrary(name: string, libraryPath: string): boolean {
  const libraries = readLibraries();
  if (libraries.some(lib => lib.name === name)) {
    return false; // Name already exists
  }
  libraries.push({ name, path: libraryPath });
  writeLibraries(libraries);
  return true;
}

export function archiveLibrary(name: string): boolean {
  const libraries = readLibraries();
  const index = libraries.findIndex(lib => lib.name === name);
  if (index === -1) {
    return false; // Library not found
  }

  // Remove from registry
  libraries.splice(index, 1);
  writeLibraries(libraries);
  return true;
}

export function renameLibrary(oldName: string, newName: string): boolean {
  const libraries = readLibraries();
  const library = libraries.find(lib => lib.name === oldName);
  if (!library) {
    return false; // Library not found
  }

  // Check if new name already exists
  if (libraries.some(lib => lib.name === newName && lib.name !== oldName)) {
    return false; // New name already exists
  }

  // Update the name
  library.name = newName;
  writeLibraries(libraries);
  return true;
}

export function getLibrary(name: string): Library | null {
  const libraries = readLibraries();
  return libraries.find(lib => lib.name === name) || null;
}

export function getLibraryNames(): string[] {
  return readLibraries().map(lib => lib.name);
}

export async function ensureLibraryStructure(libraryPath: string): Promise<void> {
  // Create library directory if it doesn't exist
  if (!fs.existsSync(libraryPath)) {
    fs.mkdirSync(libraryPath, { recursive: true });
  }

  // Create db.sqlite if it doesn't exist and initialize schema
  const dbPath = path.join(libraryPath, 'db.sqlite');
  const isNewDb = !fs.existsSync(dbPath);

  if (isNewDb) {
    // Create empty file
    fs.writeFileSync(dbPath, '');

    // Initialize database schema
    const databaseUrl = `file:${dbPath}`;
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    try {
      // Create the documents table
      await prisma.$queryRaw`
        CREATE TABLE "documents" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "filename" TEXT NOT NULL UNIQUE,
          "url" TEXT NOT NULL,
          "doctype" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "authors" TEXT NOT NULL,
          "publicationYear" INTEGER,
          "publisher" TEXT,
          "category" TEXT NOT NULL,
          "language" TEXT,
          "keywords" TEXT NOT NULL,
          "abstract" TEXT,
          "favorite" INTEGER NOT NULL DEFAULT 0,
          "metadata" TEXT,
          "hash" TEXT UNIQUE,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "numPages" INTEGER NOT NULL DEFAULT 0
        )
      `;

      // Create trigger to update updatedAt on row changes
      await prisma.$queryRaw`
        CREATE TRIGGER update_documents_updated_at
        AFTER UPDATE ON documents
        FOR EACH ROW
        BEGIN
          UPDATE documents SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `;
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}
