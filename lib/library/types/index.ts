export interface DocumentMetadata {
  doctype: string;
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
  [key: string]: unknown;
}

export interface LibraryDocument {
  id: string;
  path: string;
  filename: string;
  metadata: DocumentMetadata;
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

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type ViewMode = "card" | "list";
