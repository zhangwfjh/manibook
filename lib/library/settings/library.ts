import { promises as fs } from 'fs';
import path from 'path';
import { Library, LibrarySettings } from '../types';
import { initializeDatabaseSchema } from '../database/schema';

const LIBRARY_SETTINGS_FILE = path.join(process.cwd(), 'settings', 'library.json');

export async function readLibrarySettings(): Promise<LibrarySettings> {
  try {
    await fs.access(LIBRARY_SETTINGS_FILE);
    const data = await fs.readFile(LIBRARY_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string })?.code === 'ENOENT') {
      return { libraries: [] };
    }
    console.error('Error reading library settings:', error);
    return { libraries: [] };
  }
}

export async function writeLibrarySettings(settings: LibrarySettings): Promise<void> {
  try {
    await fs.mkdir(path.dirname(LIBRARY_SETTINGS_FILE), { recursive: true });
    await fs.writeFile(LIBRARY_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing library settings:', error);
    throw error;
  }
}

export async function readLibraries(): Promise<Library[]> {
  const settings = await readLibrarySettings();
  return settings.libraries;
}

export async function writeLibraries(libraries: Library[]): Promise<void> {
  const settings = await readLibrarySettings();
  settings.libraries = libraries;
  await writeLibrarySettings(settings);
}

export async function getDefaultLibrary(): Promise<string | null> {
  const settings = await readLibrarySettings();
  return settings.defaultLibrary || null;
}

export async function setDefaultLibrary(libraryName: string): Promise<void> {
  const settings = await readLibrarySettings();
  settings.defaultLibrary = libraryName;
  await writeLibrarySettings(settings);
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

export async function moveLibrary(name: string, newPath: string): Promise<boolean> {
  if (!name.trim() || !newPath.trim()) {
    throw new Error('Library name and path cannot be empty');
  }

  const libraries = await readLibraries();
  const library = libraries.find(lib => lib.name === name);
  if (!library) {
    throw new Error('Library not found');
  }

  const oldPath = library.path;

  // Check if the new path is the same as the old path
  if (oldPath === newPath) {
    throw new Error('New path is the same as the current path');
  }

  // Validate path format (basic check)
  if (!newPath.startsWith('/') && !newPath.match(/^[A-Za-z]:/)) {
    throw new Error('Invalid path format');
  }

  // Check if new path already exists and is not empty
  try {
    await fs.access(newPath);
    // Path exists, check if it's empty
    const entries = await fs.readdir(newPath);
    if (entries.length > 0) {
      throw new Error('Target directory is not empty');
    }
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      // Path doesn't exist, try to create it
      try {
        await fs.mkdir(newPath, { recursive: true });
      } catch {
        throw new Error('Failed to create target directory');
      }
    } else {
      throw new Error('Failed to access target directory');
    }
  }

  async function moveDirectoryRecursive(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await moveDirectoryRecursive(srcPath, destPath);
        await fs.rmdir(srcPath);
      } else {
        await fs.copyFile(srcPath, destPath);
        await fs.unlink(srcPath);
      }
    }
  }

  await moveDirectoryRecursive(oldPath, newPath);

  // Remove the now-empty old directory
  try {
    await fs.rmdir(oldPath);
  } catch (error) {
    if ((error as { code?: string })?.code !== 'ENOENT') {
      console.warn('Failed to remove old directory:', error);
    }
  }

  // Update the library path in settings
  library.path = newPath.trim();
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
    // Database doesn't exist, initialize it
    await initializeDatabaseSchema(dbPath);
  }
}