import { promises as fs } from 'fs';
import path from 'path';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../generated/prisma/client';

export async function initializeDatabaseSchema(dbPath: string): Promise<void> {
  // Create empty database file if it doesn't exist
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, '');
  }

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
        "format" TEXT NOT NULL DEFAULT 'unknown',
        "cover" BLOB
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

export function getPrismaClient(libraryPath: string) {
  const dbPath = path.join(libraryPath, 'db.sqlite');
  const databaseUrl = `file:${dbPath}`;
  const adapter = new PrismaLibSql({ url: databaseUrl });
  return new PrismaClient({ adapter });
}