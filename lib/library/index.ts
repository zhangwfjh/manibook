import { promises as fs } from 'fs';
import path from 'path';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client';

export interface DocumentMetadata {
  doctype: 'Article' | 'Book' | 'Others';
  title: string;
  authors: string[];
  publicationYear?: number;
  publisher?: string;
  category: string;
  language: string;
  keywords: string[];
  abstract: string;
  favorite: boolean;
  numPages: number;
  filesize: number;
  format: string;
  metadata?: Record<string, unknown>;
  updatedAt?: Date;
}

export interface LibraryDocument {
  id: string;
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

export async function readLibraries(): Promise<Library[]> {
  try {
    await fs.access(LIBRARIES_FILE);
    const data = await fs.readFile(LIBRARIES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string })?.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading libraries:', error);
    return [];
  }
}

export async function writeLibraries(libraries: Library[]): Promise<void> {
  try {
    await fs.writeFile(LIBRARIES_FILE, JSON.stringify(libraries, null, 2));
  } catch (error) {
    console.error('Error writing libraries:', error);
    throw error;
  }
}

export async function addLibrary(name: string, libraryPath: string): Promise<boolean> {
  if (!name.trim() || !libraryPath.trim()) {
    throw new Error('Library name and path cannot be empty');
  }
  const libraries = await readLibraries();
  if (libraries.some(lib => lib.name === name)) {
    throw new Error('Library name already exists');
  }
  libraries.push({ name: name.trim(), path: libraryPath.trim() });
  await writeLibraries(libraries);
  return true;
}

export async function archiveLibrary(name: string): Promise<boolean> {
  const libraries = await readLibraries();
  const index = libraries.findIndex(lib => lib.name === name);
  if (index === -1) {
    throw new Error('Library not found');
  }

  // Remove from registry
  libraries.splice(index, 1);
  await writeLibraries(libraries);
  return true;
}

export async function renameLibrary(oldName: string, newName: string): Promise<boolean> {
  if (!oldName.trim() || !newName.trim()) {
    throw new Error('Library names cannot be empty');
  }
  const libraries = await readLibraries();
  const library = libraries.find(lib => lib.name === oldName);
  if (!library) {
    throw new Error('Library not found');
  }

  // Check if new name already exists
  if (libraries.some(lib => lib.name === newName)) {
    throw new Error('New library name already exists');
  }

  // Update the name
  library.name = newName.trim();
  await writeLibraries(libraries);
  return true;
}

export async function getLibrary(name: string): Promise<Library | null> {
  const libraries = await readLibraries();
  return libraries.find(lib => lib.name === name) || null;
}

export async function ensureLibraryStructure(libraryPath: string): Promise<void> {
  if (!libraryPath.trim()) {
    throw new Error('Library path cannot be empty');
  }

  // Create library directory if it doesn't exist
  try {
    await fs.mkdir(libraryPath, { recursive: true });
  } catch (error) {
    if ((error as { code?: string })?.code !== 'EEXIST') {
      throw error;
    }
  }

  // Create db.sqlite if it doesn't exist and initialize schema
  const dbPath = path.join(libraryPath, 'db.sqlite');

  try {
    await fs.access(dbPath);
    return; // Database already exists
  } catch {
    // Database doesn't exist, create it
  }

  // Create empty database file
  await fs.writeFile(dbPath, '');

  // Initialize database schema
  const databaseUrl = `file:${dbPath}`;
  const adapter = new PrismaLibSql({ url: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // Note: authors, keywords, and metadata fields store JSON strings.
    // When inserting data, serialize arrays/objects with JSON.stringify().
    // When querying, deserialize with JSON.parse().
    await prisma.$queryRaw`
      CREATE TABLE "documents" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "filename" TEXT NOT NULL UNIQUE,
        "url" TEXT NOT NULL,
        "doctype" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "authors" TEXT NOT NULL, -- JSON array of strings
        "publicationYear" INTEGER,
        "publisher" TEXT,
        "category" TEXT NOT NULL,
        "language" TEXT,
        "keywords" TEXT NOT NULL, -- JSON array of strings
        "abstract" TEXT,
        "favorite" INTEGER NOT NULL DEFAULT 0, -- 0: false, 1: true
        "metadata" TEXT, -- JSON object or null
        "hash" TEXT UNIQUE,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "numPages" INTEGER NOT NULL DEFAULT 0,
        "filesize" INTEGER NOT NULL DEFAULT 0,
        "format" TEXT NOT NULL DEFAULT 'unknown'
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
