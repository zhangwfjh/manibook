export interface DocumentMetadata {
  doctype: 'Article' | 'Book' | 'Others';
  title: string;
  authors: string[];
  publication_year?: number;
  publisher?: string;
  category: string;
  language?: string;
  keywords?: string[];
  abstract?: string;
  metadata?: Record<string, unknown>;
}

export interface LibraryDocument {
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
