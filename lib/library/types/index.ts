export interface Metadata {
  doctype: string;
  title: string;
  authors: string[];
  publication_year?: number;
  publisher?: string;
  category: string;
  language: string;
  keywords: string[];
  abstract: string;
  favorite: boolean;
  page_count: number;
  filesize: number;
  filetype: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  url: string;
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
  path: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
