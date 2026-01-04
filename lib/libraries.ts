import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from './db';

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

export async function migrateAllLibrariesFromStorage(): Promise<void> {
  const libraries = readLibraries();
  console.log(`Starting migration for ${libraries.length} libraries...`);

  for (const library of libraries) {
    console.log(`Migrating library: ${library.name}`);
    const success = await migrateLibraryFromStorage(library.name);
    if (!success) {
      console.error(`Failed to migrate library: ${library.name}`);
    }
  }

  console.log('Migration completed for all libraries');
}

export async function migrateLibraryFromStorage(libraryName: string): Promise<boolean> {
  try {
    const library = getLibrary(libraryName);
    if (!library) {
      console.error(`Library ${libraryName} not found`);
      return false;
    }

    const libraryPath = library.path;
    const storagePath = path.join(libraryPath, 'storage');

    // Check if storage folder exists
    if (!fs.existsSync(storagePath)) {
      console.log(`No storage folder found for library ${libraryName}`);
      return true; // Already migrated or no files to migrate
    }

    // Get Prisma client for this library
    const prisma = getPrismaClient(libraryPath);

    // Get all documents from database
    const documents = await prisma.document.findMany();

    // Move files and update database
    for (const doc of documents) {
      const oldFilePath = doc.filePath;
      const oldCoverUrl = doc.coverUrl;

      // Calculate new paths (remove /storage/ from path)
      const relativePath = path.relative(storagePath, oldFilePath);
      const newFilePath = path.join(libraryPath, relativePath);

      // Ensure destination directory exists
      const newDir = path.dirname(newFilePath);
      if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
      }

      // Move the file if it exists
      if (fs.existsSync(oldFilePath)) {
        fs.renameSync(oldFilePath, newFilePath);
      }

      // Update cover URL if it exists
      let newCoverUrl = oldCoverUrl;
      if (oldCoverUrl && oldCoverUrl.includes('/storage/')) {
        newCoverUrl = oldCoverUrl.replace('/storage/', '/');
      }

      // Update database record
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          filePath: newFilePath,
          coverUrl: newCoverUrl,
        },
      });
    }

    // Remove empty storage directory
    try {
      fs.rmdirSync(storagePath, { recursive: true });
    } catch (error) {
      console.warn(`Could not remove storage directory: ${error}`);
    }

    console.log(`Successfully migrated library ${libraryName} from storage folder`);
    return true;
  } catch (error) {
    console.error(`Error migrating library ${libraryName}:`, error);
    return false;
  }
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
          "filePath" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "coverUrl" TEXT,
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
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
