import React, { createContext, useContext, ReactNode } from "react";
import { LibraryDocument, Library } from "@/lib/library";
import { LibraryCategory } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDocumentHandlers } from "@/hooks/use-document-handlers";
import { useBulkOperations } from "@/hooks/use-bulk-operations";
import { useDialogContext } from "@/contexts/DialogContext";

interface LibraryContextType {
  currentLibrary: string;
  setCurrentLibrary: (library: string) => void;
  libraries: Library[];
  documents: LibraryDocument[];
  categories: LibraryCategory[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  loadPage: (page: number, filters?: URLSearchParams) => Promise<void>;
  loadFilteredData: (
    filterParams: URLSearchParams | undefined,
    sortParams: URLSearchParams | undefined,
    forceRefresh?: boolean,
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

  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  renameLibraryOpen: boolean;
  setRenameLibraryOpen: (open: boolean) => void;
  moveLibraryOpen: boolean;
  setMoveLibraryOpen: (open: boolean) => void;
  archiveLibraryOpen: boolean;
  setArchiveLibraryOpen: (open: boolean) => void;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;
  moveLibraryPath: string;
  setMoveLibraryPath: (path: string) => void;
  selectedLibraryForOperation: { name: string; path?: string };
  handleCreateLibrary: () => Promise<void>;
  handleRenameLibrary: () => Promise<void>;
  handleMoveLibrary: () => Promise<void>;
  handleArchiveLibrary: () => Promise<void>;
  resetCreateDialog: () => void;
  resetRenameDialog: () => void;
  resetMoveDialog: () => void;

  handleOpen: (doc: LibraryDocument) => void;
  handleDocumentDelete: (document: LibraryDocument) => Promise<void>;
  handleDocumentUpdate: (
    updatedDoc: LibraryDocument,
  ) => Promise<LibraryDocument | undefined>;
  handleFavoriteToggle: (document: LibraryDocument) => Promise<void>;

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
  const dialogContext = useDialogContext();

  const libraryOperations = useLibraryOperations({
    currentLibrary: libraryData.currentLibrary,
    setCurrentLibrary: libraryData.setCurrentLibrary,
    libraries: libraryData.libraries,
    onLibrariesChange: libraryData.refreshLibraries,
    // Pass dialog context setters
    setCreateLibraryOpen: dialogContext.setCreateLibraryOpen,
    newLibraryName: dialogContext.newLibraryName,
    setNewLibraryName: dialogContext.setNewLibraryName,
    newLibraryPath: dialogContext.newLibraryPath,
    setNewLibraryPath: dialogContext.setNewLibraryPath,
    setRenameLibraryOpen: dialogContext.setRenameLibraryOpen,
    selectedLibraryForOperation: dialogContext.selectedLibraryForOperation,
    setSelectedLibraryForOperation:
      dialogContext.setSelectedLibraryForOperation,
    renameLibraryName: dialogContext.renameLibraryName,
    setRenameLibraryName: dialogContext.setRenameLibraryName,
    setMoveLibraryOpen: dialogContext.setMoveLibraryOpen,
    moveLibraryPath: dialogContext.moveLibraryPath,
    setMoveLibraryPath: dialogContext.setMoveLibraryPath,
    setArchiveLibraryOpen: dialogContext.setArchiveLibraryOpen,
    resetCreateDialog: dialogContext.resetCreateDialog,
    resetRenameDialog: dialogContext.resetRenameDialog,
    resetMoveDialog: dialogContext.resetMoveDialog,
  });

  const documentHandlers = useDocumentHandlers({
    currentLibrary: libraryData.currentLibrary,
    filterParams: documentFilters.filterParams,
    sortParams: documentSorting.sortParams,
    loadFilteredData: libraryData.loadFilteredData,
  });

  const bulkOperations = useBulkOperations({
    documents: libraryData.documents,
    currentLibrary: libraryData.currentLibrary,
    filterParams: documentFilters.filterParams,
    sortParams: documentSorting.sortParams,
    loadFilteredData: libraryData.loadFilteredData,
    resetBulkDeleteDialog: dialogContext.resetBulkDeleteDialog,
  });

  const { ...restLibraryData } = libraryData;

  const value: LibraryContextType = {
    ...restLibraryData,
    ...documentFilters,
    ...documentSorting,
    // Dialog states
    createLibraryOpen: dialogContext.createLibraryOpen,
    setCreateLibraryOpen: dialogContext.setCreateLibraryOpen,
    newLibraryName: dialogContext.newLibraryName,
    setNewLibraryName: dialogContext.setNewLibraryName,
    newLibraryPath: dialogContext.newLibraryPath,
    setNewLibraryPath: dialogContext.setNewLibraryPath,
    renameLibraryOpen: dialogContext.renameLibraryOpen,
    setRenameLibraryOpen: dialogContext.setRenameLibraryOpen,
    moveLibraryOpen: dialogContext.moveLibraryOpen,
    setMoveLibraryOpen: dialogContext.setMoveLibraryOpen,
    archiveLibraryOpen: dialogContext.archiveLibraryOpen,
    setArchiveLibraryOpen: dialogContext.setArchiveLibraryOpen,
    renameLibraryName: dialogContext.renameLibraryName,
    setRenameLibraryName: dialogContext.setRenameLibraryName,
    moveLibraryPath: dialogContext.moveLibraryPath,
    setMoveLibraryPath: dialogContext.setMoveLibraryPath,
    selectedLibraryForOperation: dialogContext.selectedLibraryForOperation,
    // Library operation handlers
    handleCreateLibrary: libraryOperations.handleCreateLibrary,
    handleRenameLibrary: libraryOperations.handleRenameLibrary,
    handleMoveLibrary: libraryOperations.handleMoveLibrary,
    handleArchiveLibrary: libraryOperations.handleArchiveLibrary,
    resetCreateDialog: libraryOperations.resetCreateDialog,
    resetRenameDialog: libraryOperations.resetRenameDialog,
    resetMoveDialog: libraryOperations.resetMoveDialog,
    ...documentHandlers,
    ...bulkOperations,
    // Bulk operations dialog states
    bulkDeleteDialogOpen: dialogContext.bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen: dialogContext.setBulkDeleteDialogOpen,
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
