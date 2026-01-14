import { getPrismaClient } from '../database/schema';
import { validateLibraryAccess } from './validation';

export { getPrismaClient } from '../database/schema';

export async function getLibraryPrisma(libraryName: string) {
  const validation = await validateLibraryAccess(libraryName);
  if (validation.error) {
    throw new Error(validation.error);
  }
  return getPrismaClient(validation.libraryInfo!.path);
}