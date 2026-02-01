"use client";

import { createContext, useContext, PropsWithChildren } from "react";
import {
  useLibraryStore,
  useDebouncedSearch,
  useLibraryInit,
} from "@/stores/libraryStore";
import { Document, Library, Category } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";

interface LibraryContextType {
  // Data state
  libraryName: string;
  setLibraryName: (library: string) => void;
  libraries: Library[];
  documents: Document[];
  categories: Category[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  filterOptions: Record<string, Record<string, number>> & {
    languages?: Record<string, number>;
  };

  // Filter state
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
  isSearching: boolean;
  resetFilters: () => void;

  // Sort state
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortParams: URLSearchParams;

  // Data operations
  loadPage: (page: number, filters?: URLSearchParams) => Promise<void>;
  loadFilteredData: () => Promise<void>;
  refreshLibraries: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Document operations
  openDocument: (doc: Document) => Promise<void>;
  deleteDocument: (document: Document) => Promise<void>;
  updateDocument: (updatedDoc: Document) => Promise<Document | undefined>;
  toggleFavorite: (document: Document) => Promise<Document | undefined>;

  // Library operations
  createLibrary: (name: string, path: string) => Promise<boolean>;

  // Bulk operations
  selectionMode: boolean;
  selectedDocuments: Set<string>;
  toggleSelectionMode: () => void;
  toggleDocumentSelection: (documentId: string) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;
  bulkDelete: () => Promise<void>;
  bulkMove: (doctype: string, category: string) => Promise<void>;

  // UI State - Document dialog
  selectedDocument: Document | null;
  setSelectedDocument: (document: Document | null) => void;
  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;
  openDocumentDialog: (document: Document) => void;
  closeDocumentDialog: () => void;

  // UI State - Create library dialog
  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  resetCreateDialog: () => void;

  // UI State - Bulk delete dialog
  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  // Wrapper for document click handling
  handleDocumentClick: (document: Document) => void;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<Document | undefined>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: PropsWithChildren) {
  // Use Zustand store
  const store = useLibraryStore();

  // Initialize data loading
  useLibraryInit();

  // Setup debounced search
  useDebouncedSearch();

  // Build the context value from store state and actions
  const value: LibraryContextType = {
    // Data state
    libraryName: store.libraryName,
    setLibraryName: store.setLibraryName,
    libraries: store.libraries,
    documents: store.documents,
    categories: store.categories,
    loading: store.loading,
    pagination: store.pagination,
    currentPage: store.currentPage,
    filterOptions: store.filterOptions,

    // Filter state
    selectedCategory: store.filters.selectedCategory,
    setSelectedCategory: store.setSelectedCategory,
    selectedKeywords: store.filters.selectedKeywords,
    setSelectedKeywords: store.setSelectedKeywords,
    selectedFormats: store.filters.selectedFormats,
    setSelectedFormats: store.setSelectedFormats,
    selectedAuthors: store.filters.selectedAuthors,
    setSelectedAuthors: store.setSelectedAuthors,
    selectedPublishers: store.filters.selectedPublishers,
    setSelectedPublishers: store.setSelectedPublishers,
    selectedLanguages: store.filters.selectedLanguages,
    setSelectedLanguages: store.setSelectedLanguages,
    searchQuery: store.filters.searchQuery,
    setSearchQuery: store.setSearchQuery,
    showFavoritesOnly: store.filters.showFavoritesOnly,
    setShowFavoritesOnly: store.setShowFavoritesOnly,
    filterParams: store.getFilterParams(),
    hasActiveFilters: store.getHasActiveFilters(),
    isSearching: store.isSearching,
    resetFilters: store.resetFilters,

    // Sort state
    sortBy: store.sortBy,
    setSortBy: store.setSortBy,
    sortParams: store.getSortParams(),

    // Data operations
    loadPage: store.loadPage,
    loadFilteredData: store.loadFilteredData,
    refreshLibraries: store.refreshLibraries,
    refreshData: store.refreshData,

    // Document operations
    openDocument: store.openDocument,
    deleteDocument: store.deleteDocument,
    updateDocument: store.updateDocument,
    toggleFavorite: store.toggleFavorite,

    // Library operations
    createLibrary: store.createLibrary,

    // Bulk operations
    selectionMode: store.selectionMode,
    selectedDocuments: store.selectedDocuments,
    toggleSelectionMode: store.toggleSelectionMode,
    toggleDocumentSelection: store.toggleDocumentSelection,
    selectAllDocuments: store.selectAllDocuments,
    clearSelection: store.clearSelection,
    bulkDelete: store.bulkDelete,
    bulkMove: store.bulkMove,

    // UI State - Document dialog
    selectedDocument: store.selectedDocument,
    setSelectedDocument: store.setSelectedDocument,
    documentDialogOpen: store.documentDialogOpen,
    setDocumentDialogOpen: store.setDocumentDialogOpen,
    openDocumentDialog: store.openDocumentDialog,
    closeDocumentDialog: store.closeDocumentDialog,

    // UI State - Create library dialog
    createLibraryOpen: store.createLibraryOpen,
    setCreateLibraryOpen: store.setCreateLibraryOpen,
    newLibraryName: store.newLibraryName,
    setNewLibraryName: store.setNewLibraryName,
    newLibraryPath: store.newLibraryPath,
    setNewLibraryPath: store.setNewLibraryPath,
    resetCreateDialog: store.resetCreateDialog,

    // UI State - Bulk delete dialog
    bulkDeleteDialogOpen: store.bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen: store.setBulkDeleteDialogOpen,

    // Wrapper functions
    handleDocumentClick: store.handleDocumentClick,
    handleDocumentUpdate: store.handleDocumentUpdate,
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

// Direct store export for components that want to use Zustand directly
export { useLibraryStore };
