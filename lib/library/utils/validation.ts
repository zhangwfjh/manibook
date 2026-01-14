import { getLibrary } from '../settings/library';

export async function validateLibraryAccess(libraryName: string) {
  const libraryInfo = await getLibrary(libraryName);
  if (!libraryInfo) {
    return { error: 'Library not found', status: 404 };
  }
  return { libraryInfo };
}