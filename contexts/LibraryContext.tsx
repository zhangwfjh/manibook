"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { Document, Library, Category } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";

interface DocumentsResponse {
  documents: Document[];
  total_count: number;
  limit: number;
  page: number;
  has_next: boolean;
  has_prev: boolean;
  filter_options?: Record<string, Record<string, number>>;
}

interface FilterState {
  selectedCategory: string;
  selectedKeywords: string[];
  selectedFormats: string[];
  selectedAuthors: string[];
  selectedPublishers: string[];
  selectedLanguages: string[];
  showFavoritesOnly: boolean;
  searchQuery: string;
}

const initialFilters: FilterState = {
  selectedCategory: "",
  selectedKeywords: [],
  selectedFormats: [],
  selectedAuthors: [],
  selectedPublishers: [],
  selectedLanguages: [],
  showFavoritesOnly: false,
  searchQuery: "",
};

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

interface LibraryProviderProps {
  children: ReactNode;
}

export function LibraryProvider({ children }: LibraryProviderProps) {
  // Core data state (from useLibrary)
  const [libraryName, setLibraryName] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState<
    Record<string, Record<string, number>>
  >({});

  // Filter state (from useLibrary)
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [debouncedSearchQuery] = useDebounce(filters.searchQuery, 300);
  const [isSearching, setIsSearching] = useState(false);

  // Sort state (from useLibrary)
  const [sortBy, setSortBy] = useState<string>("updatedAt-desc");

  // Bulk operations state (from useLibrary)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  const isMountedRef = useRef(true);
  const pageSize = 50;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Build filter params from current state (from useLibrary)
  const filterParams = (() => {
    const params = new URLSearchParams();

    if (filters.selectedCategory) {
      params.set("category", filters.selectedCategory);
    }
    if (filters.selectedKeywords.length > 0) {
      params.set("keywords", filters.selectedKeywords.join(","));
    }
    if (filters.selectedFormats.length > 0) {
      params.set("formats", filters.selectedFormats.join(","));
    }
    if (filters.selectedAuthors.length > 0) {
      params.set("authors", filters.selectedAuthors.join(","));
    }
    if (filters.selectedPublishers.length > 0) {
      params.set("publishers", filters.selectedPublishers.join(","));
    }
    if (filters.selectedLanguages.length > 0) {
      params.set("languages", filters.selectedLanguages.join(","));
    }
    if (debouncedSearchQuery) {
      params.set("search", debouncedSearchQuery);
    }
    if (filters.showFavoritesOnly) {
      params.set("favoritesOnly", "true");
    }

    return params;
  })();

  const sortParams = (() => {
    const params = new URLSearchParams();
    if (sortBy) {
      params.set("sortBy", sortBy);
    }
    return params;
  })();

  // Data fetching (from useLibrary)
  const fetchLibraries = async () => {
    try {
      const libs = await invoke<Library[]>("get_libraries");
      if (isMountedRef.current) {
        setLibraries(libs);
      }
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await invoke<Category[]>("get_library_categories");
      if (isMountedRef.current) {
        setCategories(cats);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      if (isMountedRef.current) {
        setCategories([]);
      }
    }
  };

  const fetchDocuments = async (
    page: number = 1,
    additionalParams?: URLSearchParams,
  ) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setIsSearching(filters.searchQuery !== debouncedSearchQuery);
      }

      const query = {
        page: parseInt(params.get("page") || "1"),
        limit: Math.min(parseInt(params.get("limit") || "50"), 200),
        category: params.get("category") || undefined,
        search_query: params.get("search") || undefined,
        keywords: params.get("keywords")?.split(",").filter(Boolean) || [],
        formats: params.get("formats")?.split(",").filter(Boolean) || [],
        authors: params.get("authors")?.split(",").filter(Boolean) || [],
        publishers: params.get("publishers")?.split(",").filter(Boolean) || [],
        languages: params.get("languages")?.split(",").filter(Boolean) || [],
        favorites_only: params.get("favoritesOnly") === "true",
        sort_by: params.get("sortBy") || "createdAt-desc",
      };

      const data = await invoke<DocumentsResponse>("get_documents", { query });

      if (isMountedRef.current) {
        const docs = data?.documents || [];
        const totalPages = Math.ceil(
          (data?.total_count || 0) / (data?.limit || query.limit),
        );
        const paginationData = {
          page: data?.page || query.page,
          limit: data?.limit || query.limit,
          totalCount: data?.total_count || 0,
          totalPages,
          hasNextPage: !!data?.has_next,
          hasPrevPage: !!data?.has_prev,
        };
        const filterOpts = data?.filter_options || {};

        setDocuments(docs);
        setPagination(paginationData);
        setFilterOptions(filterOpts);
        setIsSearching(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error fetching documents:", error);
        setIsSearching(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Effects (from useLibrary)
  useEffect(() => {
    fetchLibraries();
  }, []);

  useEffect(() => {
    if (libraryName) {
      fetchCategories();
    }
  }, [libraryName]);

  // Data operations (from useLibrary)
  const refreshLibraries = async () => {
    await fetchLibraries();
  };

  const refreshData = async () => {
    await Promise.all([fetchDocuments(currentPage), fetchCategories()]);
  };

  const loadPage = async (page: number, extraFilters?: URLSearchParams) => {
    setCurrentPage(page);
    await fetchDocuments(page, extraFilters);
  };

  const loadFilteredData = async () => {
    const combined = new URLSearchParams();
    filterParams.forEach((v, k) => combined.set(k, v));
    sortParams.forEach((v, k) => combined.set(k, v));
    setCurrentPage(1);
    await fetchDocuments(1, combined);
  };

  // Document operations (from useLibrary)
  const openDocument = async (doc: Document) => {
    try {
      await invoke("open_document", { documentId: doc.id });
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  };

  const deleteDocument = async (document: Document) => {
    try {
      await invoke("delete_documents", { documentIds: [document.id] });
      await loadFilteredData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const updateDocument = async (
    updatedDoc: Document,
  ): Promise<Document | undefined> => {
    try {
      const result = await invoke<Document>("update_document", {
        documentId: updatedDoc.id,
        metadata: updatedDoc.metadata,
      });
      await loadFilteredData();
      return result;
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
      return updatedDoc;
    }
  };

  const toggleFavorite = async (document: Document) => {
    const updatedDoc = {
      ...document,
      metadata: {
        ...document.metadata,
        favorite: !document.metadata.favorite,
      },
    };
    return await updateDocument(updatedDoc);
  };

  // Library operations (from useLibrary)
  const createLibrary = async (
    name: string,
    path: string,
  ): Promise<boolean> => {
    if (!name || !path) {
      toast.error("Please fill in all fields");
      return false;
    }

    try {
      await invoke("create_library", { name, path });
      await invoke("open_library", { libraryName: name });
      toast.success("Library created successfully");
      setLibraryName(name);
      await refreshLibraries();
      return true;
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error(
        typeof error === "string" ? error : "Failed to create library",
      );
      return false;
    }
  };

  // Bulk operations (from useLibrary)
  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedDocuments(new Set());
  };

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    const allIds = documents.map((doc) => doc.id);
    setSelectedDocuments(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const bulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{ deletedCount: number; errors?: unknown }>(
        "delete_documents",
        {
          documentIds: Array.from(selectedDocuments),
        },
      );

      toast.success(`Successfully deleted ${result.deletedCount} document(s)`);
      setSelectedDocuments(new Set());
      setSelectionMode(false);
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast.error("Failed to delete documents");
    }
  };

  const bulkMove = async (doctype: string, category: string) => {
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{
        movedCount: number;
        errorCount: number;
        errors?: unknown;
      }>("move_documents", {
        documentIds: Array.from(selectedDocuments),
        doctype,
        category,
      });

      toast.success(`Successfully moved ${result.movedCount} document(s)`);
      if (result.errorCount > 0) {
        toast.error(`Failed to move ${result.errorCount} document(s)`);
      }
      setSelectedDocuments(new Set());
      setSelectionMode(false);
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk moving documents:", error);
      toast.error("Failed to move documents");
    }
  };

  // Filter setters (from useLibrary)
  const setSelectedCategory = (category: string) =>
    setFilters((prev) => ({ ...prev, selectedCategory: category }));
  const setSelectedKeywords = (keywords: string[]) =>
    setFilters((prev) => ({ ...prev, selectedKeywords: keywords }));
  const setSelectedFormats = (formats: string[]) =>
    setFilters((prev) => ({ ...prev, selectedFormats: formats }));
  const setSelectedAuthors = (authors: string[]) =>
    setFilters((prev) => ({ ...prev, selectedAuthors: authors }));
  const setSelectedPublishers = (publishers: string[]) =>
    setFilters((prev) => ({ ...prev, selectedPublishers: publishers }));
  const setSelectedLanguages = (languages: string[]) =>
    setFilters((prev) => ({ ...prev, selectedLanguages: languages }));
  const setShowFavoritesOnly = (show: boolean) =>
    setFilters((prev) => ({ ...prev, showFavoritesOnly: show }));
  const setSearchQuery = (query: string) =>
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  const resetFilters = () => setFilters(initialFilters);

  // UI state - Document dialog (from LibraryContext)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);

  // UI state - Create library dialog (from LibraryContext)
  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");

  // UI state - Bulk delete dialog (from LibraryContext)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // UI helper functions (from LibraryContext)
  const resetCreateDialog = () => {
    setNewLibraryName("");
    setNewLibraryPath("");
    setCreateLibraryOpen(false);
  };

  const openDocumentDialog = (document: Document) => {
    setSelectedDocument(document);
    setDocumentDialogOpen(true);
  };

  const closeDocumentDialog = () => {
    setDocumentDialogOpen(false);
    setSelectedDocument(null);
  };

  // Wrapper for document click - decides between selection mode or opening dialog (from LibraryContext)
  const handleDocumentClick = (document: Document) => {
    if (selectionMode) {
      toggleDocumentSelection(document.id);
    } else {
      openDocumentDialog(document);
    }
  };

  // Wrapper for document update - updates then refreshes dialog state (from LibraryContext)
  const handleDocumentUpdate = async (
    updatedDoc: Document,
  ): Promise<Document | undefined> => {
    const resultDoc = await updateDocument(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
    return resultDoc;
  };

  // Compute hasActiveFilters
  const hasActiveFilters = !!(
    filters.selectedCategory ||
    filters.selectedKeywords.length ||
    filters.selectedFormats.length ||
    filters.selectedAuthors.length ||
    filters.selectedPublishers.length ||
    filters.selectedLanguages.length ||
    filters.searchQuery ||
    filters.showFavoritesOnly
  );

  const value: LibraryContextType = {
    // Data state (from useLibrary)
    libraryName,
    setLibraryName,
    libraries,
    documents,
    categories,
    loading,
    pagination,
    currentPage,
    filterOptions,

    // Filter state (from useLibrary)
    selectedCategory: filters.selectedCategory,
    setSelectedCategory,
    selectedKeywords: filters.selectedKeywords,
    setSelectedKeywords,
    selectedFormats: filters.selectedFormats,
    setSelectedFormats,
    selectedAuthors: filters.selectedAuthors,
    setSelectedAuthors,
    selectedPublishers: filters.selectedPublishers,
    setSelectedPublishers,
    selectedLanguages: filters.selectedLanguages,
    setSelectedLanguages,
    searchQuery: filters.searchQuery,
    setSearchQuery,
    showFavoritesOnly: filters.showFavoritesOnly,
    setShowFavoritesOnly,
    filterParams,
    hasActiveFilters,
    isSearching,
    resetFilters,

    // Sort state (from useLibrary)
    sortBy,
    setSortBy,
    sortParams,

    // Data operations (from useLibrary)
    loadPage,
    loadFilteredData,
    refreshLibraries,
    refreshData,

    // Document operations (from useLibrary)
    openDocument,
    deleteDocument,
    updateDocument,
    toggleFavorite,

    // Library operations (from useLibrary)
    createLibrary,

    // Bulk operations (from useLibrary)
    selectionMode,
    selectedDocuments,
    toggleSelectionMode,
    toggleDocumentSelection,
    selectAllDocuments,
    clearSelection,
    bulkDelete,
    bulkMove,

    // UI State - Document dialog (from LibraryContext)
    selectedDocument,
    setSelectedDocument,
    documentDialogOpen,
    setDocumentDialogOpen,
    openDocumentDialog,
    closeDocumentDialog,

    // UI State - Create library dialog (from LibraryContext)
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    resetCreateDialog,

    // UI State - Bulk delete dialog (from LibraryContext)
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,

    // Wrapper functions (from LibraryContext)
    handleDocumentClick,
    handleDocumentUpdate,
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
