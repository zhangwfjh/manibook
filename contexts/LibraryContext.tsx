"use client";

import { createContext, useContext, ReactNode, useState } from "react";
import { Document, Library, Category } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDocumentHandlers } from "@/hooks/use-document-handlers";
import { useBulkOperations } from "@/hooks/use-bulk-operations";

interface LibraryContextType {
  libraryName: string;
  setLibraryName: (library: string) => void;
  libraries: Library[];
  documents: Document[];
  categories: Category[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  loadPage: (page: number, filters?: URLSearchParams) => Promise<void>;
  loadFilteredData: (
    filterParams: URLSearchParams | undefined,
    sortParams: URLSearchParams | undefined,
  ) => Promise<void>;
  refreshLibraryData: () => Promise<void>;
  filterOptions: Record<string, Record<string, number>> & {
    languages?: Record<string, number>;
  };

  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedKeywords: string[];
  setSelectedKeywords: (keywords: string[]) => void;
  selectedFormats: string[];
  setSelectedFormats: (formats: string[]) => void;
  selectedAuthors: string[];
  setSelectedAuthors: (authors: string[]) => void;
  selectedPublishers: string[];
  setSelectedPublishers: (publishers: string[]) => void;
  selectedLanguages: string[];
  setSelectedLanguages: (languages: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
  filterParams: URLSearchParams;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  isSearching: boolean;

  sortBy: string;
  setSortBy: (sort: string) => void;
  sortParams: URLSearchParams;

  selectedDocument: Document | null;
  setSelectedDocument: (document: Document | null) => void;
  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;

  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  handleCreateLibrary: () => Promise<void>;
  resetCreateDialog: () => void;

  handleOpen: (doc: Document) => void;
  handleDocumentDelete: (document: Document) => Promise<void>;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<Document | undefined>;
  handleFavoriteToggle: (document: Document) => Promise<void>;
  handleDocumentClick: (document: Document) => void;

  selectionMode: boolean;
  selectedDocuments: Set<string>;
  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;
  handleToggleSelectionMode: () => void;
  handleToggleDocumentSelection: (documentId: string) => void;
  handleSelectAllDocuments: () => void;
  handleClearSelection: () => void;
  handleBulkDelete: () => Promise<void>;
  handleBulkMove: (doctype: string, category: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

interface LibraryProviderProps {
  children: ReactNode;
}

export function LibraryProvider({ children }: LibraryProviderProps) {
  const libraryData = useLibraryData();
  const documentFilters = useDocumentFilters();
  const documentSorting = useDocumentSorting();

  // Dialog states
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);

  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const resetCreateDialog = () => {
    setNewLibraryName("");
    setNewLibraryPath("");
    setCreateLibraryOpen(false);
  };

  const libraryOperations = useLibraryOperations({
    setLibraryName: libraryData.setLibraryName,
    onLibrariesChange: libraryData.refreshLibraries,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    resetCreateDialog,
    setBulkDeleteDialogOpen,
  });

  const documentHandlers = useDocumentHandlers({
    filterParams: documentFilters.filterParams,
    sortParams: documentSorting.sortParams,
    loadFilteredData: libraryData.loadFilteredData,
  });

  const bulkOperations = useBulkOperations({
    documents: libraryData.documents,
    filterParams: documentFilters.filterParams,
    sortParams: documentSorting.sortParams,
    loadFilteredData: libraryData.loadFilteredData,
    setBulkDeleteDialogOpen,
  });

  const { ...restLibraryData } = libraryData;

  const handleDocumentClick = (document: Document) => {
    if (bulkOperations.selectionMode) {
      bulkOperations.handleToggleDocumentSelection(document.id);
    } else {
      setSelectedDocument(document);
      setDocumentDialogOpen(true);
    }
  };

  const handleDocumentUpdateWrapper = async (
    updatedDoc: Document,
  ): Promise<Document | undefined> => {
    const resultDoc = await documentHandlers.handleDocumentUpdate(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
    return resultDoc;
  };

  const value: LibraryContextType = {
    ...restLibraryData,
    ...documentFilters,
    ...documentSorting,
    // Document dialog states
    selectedDocument,
    setSelectedDocument,
    documentDialogOpen,
    setDocumentDialogOpen,
    // Create library dialog states
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    // Library operation handlers
    handleCreateLibrary: libraryOperations.handleCreateLibrary,
    resetCreateDialog,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
    handleOpen: documentHandlers.handleOpen,
    handleDocumentDelete: documentHandlers.handleDocumentDelete,
    handleFavoriteToggle: documentHandlers.handleFavoriteToggle,
    ...bulkOperations,
    // Bulk delete dialog state
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    // Document click handler
    handleDocumentClick: handleDocumentClick,
  };

  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}

export function useLibraryContext(): LibraryContextType {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibraryContext must be used within a LibraryProvider");
  }
  return context;
}
