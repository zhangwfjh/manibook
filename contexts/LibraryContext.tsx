import { createContext, useContext, ReactNode } from "react";
import { Document, Library, Category } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDocumentHandlers } from "@/hooks/use-document-handlers";
import { useBulkOperations } from "@/hooks/use-bulk-operations";
import { useDialogContext } from "@/contexts/DialogContext";

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
  handleCreateLibrary: () => Promise<void>;
  resetCreateDialog: () => void;

  handleOpen: (doc: Document) => void;
  handleDocumentDelete: (document: Document) => Promise<void>;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<Document | undefined>;
  handleFavoriteToggle: (document: Document) => Promise<void>;

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
    setLibraryName: libraryData.setLibraryName,
    onLibrariesChange: libraryData.refreshLibraries,
    setCreateLibraryOpen: dialogContext.setCreateLibraryOpen,
    newLibraryName: dialogContext.newLibraryName,
    setNewLibraryName: dialogContext.setNewLibraryName,
    newLibraryPath: dialogContext.newLibraryPath,
    setNewLibraryPath: dialogContext.setNewLibraryPath,
    resetCreateDialog: dialogContext.resetCreateDialog,
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
    // Library operation handlers
    handleCreateLibrary: libraryOperations.handleCreateLibrary,
    resetCreateDialog: libraryOperations.resetCreateDialog,
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
