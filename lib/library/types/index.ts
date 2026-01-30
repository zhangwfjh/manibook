export interface Metadata {
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

export interface Document {
  id: string;
  path: string;
  filename: string;
  metadata: Metadata;
}

export interface Category {
  name: string;
  path: string[];
  children: Category[];
  documents: Document[];
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
