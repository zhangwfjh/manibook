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
  categoryPath: string[];
  url: string;
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

export interface LibrarySettings {
  libraries: Library[];
  defaultLibrary?: string;
}

export interface LLMProvider {
  name: string;
  type: 'OpenAI' | 'Ollama';
  model: string;
  baseURL: string;
  apiKey?: string;
}

export interface LLMSettings {
  providers: LLMProvider[];
  jobs: {
    metadataExtraction: string;
    imageTextExtraction: string;
  };
}

export interface ExtractionResult {
  metadata: DocumentMetadata;
  cover: Uint8Array | null;
  numPages: number;
}

export interface ForewordExtraction {
  foreword: string;
  images: Uint8Array[];
  numPages: number;
}
