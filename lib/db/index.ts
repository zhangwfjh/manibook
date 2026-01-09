import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client';
import path from 'path';

// Cache for Prisma clients by library path
const prismaClients = new Map<string, PrismaClient>();

export function getPrismaClient(libraryPath: string): PrismaClient {
  const dbPath = path.join(libraryPath, 'db.sqlite');
  const databaseUrl = `file:${dbPath}`;
  const adapter = new PrismaLibSql({ url: databaseUrl });
  if (!prismaClients.has(databaseUrl)) {
    const client = new PrismaClient({ adapter });
    prismaClients.set(databaseUrl, client);
  }

  return prismaClients.get(databaseUrl)!;
}
