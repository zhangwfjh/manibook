export enum DocType {
    Article = "Article",
    Book = "Book",
    Others = "Others"
}

export interface Document {
    id: string;
    doctype: DocType;
    title: string;
    authors: string[];
    publication_year?: number;
    publisher?: string;
    category: string;
    language: string;
    keywords: string[];
    abstract?: string;
    info: Record<string, string>;
    size: number;
    format: string;
    created_time: Date;
    file_path: string;
    num_pages?: number;
    cover_image?: Uint8Array;
    file_blob?: Blob;
    hash: string;
}