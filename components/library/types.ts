// Shared types for library components

import { Document } from "@/lib/library";

export type ViewMode = "card" | "list";

export type SortOption =
  | "title-asc" | "title-desc"
  | "author-asc" | "author-desc"
  | "publisher-asc" | "publisher-desc"
  | "publicationYear-desc" | "publicationYear-asc"
  | "language-asc" | "language-desc"
  | "doctype-asc" | "doctype-desc"
  | "numPages-asc" | "numPages-desc"
  | "favorite-desc" | "favorite-asc"
  | "updatedAt-desc" | "updatedAt-asc"
  | "filesize-asc" | "filesize-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "author-asc", label: "Author A-Z" },
  { value: "author-desc", label: "Author Z-A" },
  { value: "publisher-asc", label: "Publisher A-Z" },
  { value: "publisher-desc", label: "Publisher Z-A" },
  { value: "publicationYear-desc", label: "Publication Year Newest" },
  { value: "publicationYear-asc", label: "Publication Year Oldest" },
  { value: "language-asc", label: "Language A-Z" },
  { value: "language-desc", label: "Language Z-A" },
  { value: "doctype-asc", label: "Type A-Z" },
  { value: "doctype-desc", label: "Type Z-A" },
  { value: "numPages-asc", label: "Pages Fewest" },
  { value: "numPages-desc", label: "Pages Most" },
  { value: "favorite-desc", label: "Favorites First" },
  { value: "favorite-asc", label: "Non-Favorites First" },
  { value: "updatedAt-desc", label: "Recently Updated" },
  { value: "updatedAt-asc", label: "Least Recently Updated" },
  { value: "filesize-asc", label: "File Size Smallest" },
  { value: "filesize-desc", label: "File Size Largest" },
];

export const DOCTYPE_OPTIONS = ["Book", "Paper", "Report", "Manual", "Others"];

export interface DocumentActionsProps {
  onClick?: (document: Document) => void;
  onOpen?: (document: Document) => void;
  onFavoriteToggle?: (document: Document) => void;
  onDelete?: (document: Document) => void;
}

export interface DocumentSelectionProps {
  selectionMode?: boolean;
  selectedDocuments?: Set<string>;
  onToggleSelection?: (documentId: string) => void;
}

export interface DocumentDisplayProps
  extends DocumentActionsProps,
  DocumentSelectionProps {
  document: Document;
  style?: React.CSSProperties;
  selected?: boolean;
}

export interface DocumentListProps
  extends DocumentActionsProps,
  DocumentSelectionProps {
  documents: Document[];
  useVirtualization?: boolean;
}