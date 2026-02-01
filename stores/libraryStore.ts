"use client";

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { useEffect } from "react";
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

interface LibraryStoreState {
  // Data state
  libraryName: string;
  libraries: Library[];
  documents: Document[];
  categories: Category[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  filterOptions: Record<string, Record<string, number>>;

  // Filter state
  filters: FilterState;
  isSearching: boolean;

  // Sort state
  sortBy: string;

  // Bulk operations state
  selectionMode: boolean;
  selectedDocuments: Set<string>;

  // UI State - Document dialog
  selectedDocument: Document | null;
  documentDialogOpen: boolean;

  // UI State - Create library dialog
  createLibraryOpen: boolean;
  newLibraryName: string;
  newLibraryPath: string;

  // UI State - Bulk delete dialog
  bulkDeleteDialogOpen: boolean;

  // Actions - Data state
  setLibraryName: (name: string) => void;
  setLibraries: (libraries: Library[]) => void;
  setDocuments: (documents: Document[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  setPagination: (pagination: PaginationInfo | null) => void;
  setCurrentPage: (page: number) => void;
  setFilterOptions: (options: Record<string, Record<string, number>>) => void;

  // Actions - Filter state
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setSelectedCategory: (category: string) => Promise<void>;
  setSelectedKeywords: (keywords: string[]) => Promise<void>;
  setSelectedFormats: (formats: string[]) => Promise<void>;
  setSelectedAuthors: (authors: string[]) => Promise<void>;
  setSelectedPublishers: (publishers: string[]) => Promise<void>;
  setSelectedLanguages: (languages: string[]) => Promise<void>;
  setShowFavoritesOnly: (show: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  resetFilters: () => Promise<void>;

  // Actions - Sort state
  setSortBy: (sort: string) => Promise<void>;

  // Actions - Bulk operations
  setSelectionMode: (mode: boolean) => void;
  setSelectedDocuments: (documents: Set<string>) => void;
  toggleSelectionMode: () => void;
  toggleDocumentSelection: (documentId: string) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;

  // Actions - UI State
  setSelectedDocument: (document: Document | null) => void;
  setDocumentDialogOpen: (open: boolean) => void;
  setCreateLibraryOpen: (open: boolean) => void;
  setNewLibraryName: (name: string) => void;
  setNewLibraryPath: (path: string) => void;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  // Data operations
  fetchLibraries: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchDocuments: (page?: number, additionalParams?: URLSearchParams) => Promise<void>;
  refreshLibraries: () => Promise<void>;
  refreshData: () => Promise<void>;
  loadPage: (page: number, extraFilters?: URLSearchParams) => Promise<void>;
  loadFilteredData: () => Promise<void>;

  // Document operations
  openDocument: (doc: Document) => Promise<void>;
  deleteDocument: (document: Document) => Promise<void>;
  updateDocument: (updatedDoc: Document) => Promise<Document | undefined>;
  toggleFavorite: (document: Document) => Promise<Document | undefined>;

  // Library operations
  createLibrary: (name: string, path: string) => Promise<boolean>;

  // Bulk operations
  bulkDelete: () => Promise<void>;
  bulkMove: (doctype: string, category: string) => Promise<void>;

  // UI helper functions
  resetCreateDialog: () => void;
  openDocumentDialog: (document: Document) => void;
  closeDocumentDialog: () => void;
  handleDocumentClick: (document: Document) => void;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<Document | undefined>;

  // Derived values (computed)
  getFilterParams: () => URLSearchParams;
  getSortParams: () => URLSearchParams;
  getHasActiveFilters: () => boolean;
}

const pageSize = 50;

export const useLibraryStore = create<LibraryStoreState>((set, get) => ({
  // Initial state
  libraryName: "",
  libraries: [],
  documents: [],
  categories: [],
  loading: true,
  pagination: null,
  currentPage: 1,
  filterOptions: {},
  filters: initialFilters,
  isSearching: false,
  sortBy: "updatedAt-desc",
  selectionMode: false,
  selectedDocuments: new Set(),
  selectedDocument: null,
  documentDialogOpen: false,
  createLibraryOpen: false,
  newLibraryName: "",
  newLibraryPath: "",
  bulkDeleteDialogOpen: false,

  // Actions - Data state
  setLibraryName: (name) => set({ libraryName: name }),
  setLibraries: (libraries) => set({ libraries }),
  setDocuments: (documents) => set({ documents }),
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  setPagination: (pagination) => set({ pagination }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setFilterOptions: (options) => set({ filterOptions: options }),

  // Actions - Filter state (consolidated with helper)
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  // Filter setters with auto-reload (except search which has debouncing)
  setSelectedCategory: async (category) => {
    get().setFilter("selectedCategory", category);
    await get().loadFilteredData();
  },
  setSelectedKeywords: async (keywords) => {
    get().setFilter("selectedKeywords", keywords);
    await get().loadFilteredData();
  },
  setSelectedFormats: async (formats) => {
    get().setFilter("selectedFormats", formats);
    await get().loadFilteredData();
  },
  setSelectedAuthors: async (authors) => {
    get().setFilter("selectedAuthors", authors);
    await get().loadFilteredData();
  },
  setSelectedPublishers: async (publishers) => {
    get().setFilter("selectedPublishers", publishers);
    await get().loadFilteredData();
  },
  setSelectedLanguages: async (languages) => {
    get().setFilter("selectedLanguages", languages);
    await get().loadFilteredData();
  },
  setShowFavoritesOnly: async (show) => {
    get().setFilter("showFavoritesOnly", show);
    await get().loadFilteredData();
  },
  setSearchQuery: (query) => get().setFilter("searchQuery", query),
  setIsSearching: (isSearching) => set({ isSearching }),
  resetFilters: async () => {
    set({ filters: initialFilters, currentPage: 1 });
    await get().loadFilteredData();
  },

  // Actions - Sort state (with auto-reload)
  setSortBy: async (sort) => {
    set({ sortBy: sort });
    await get().loadFilteredData();
  },

  // Actions - Bulk operations
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSelectedDocuments: (documents) => set({ selectedDocuments: documents }),
  toggleSelectionMode: () =>
    set((state) => ({
      selectionMode: !state.selectionMode,
      selectedDocuments: new Set(),
    })),
  toggleDocumentSelection: (documentId) =>
    set((state) => {
      const newSet = new Set(state.selectedDocuments);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return { selectedDocuments: newSet };
    }),
  selectAllDocuments: () =>
    set((state) => ({
      selectedDocuments: new Set(state.documents.map((doc) => doc.id)),
    })),
  clearSelection: () => set({ selectedDocuments: new Set() }),

  // Actions - UI State
  setSelectedDocument: (document) => set({ selectedDocument: document }),
  setDocumentDialogOpen: (open) => set({ documentDialogOpen: open }),
  setCreateLibraryOpen: (open) => set({ createLibraryOpen: open }),
  setNewLibraryName: (name) => set({ newLibraryName: name }),
  setNewLibraryPath: (path) => set({ newLibraryPath: path }),
  setBulkDeleteDialogOpen: (open) => set({ bulkDeleteDialogOpen: open }),

  // Data operations
  fetchLibraries: async () => {
    try {
      const libs = await invoke<Library[]>("get_libraries");
      set({ libraries: libs });
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  },

  fetchCategories: async () => {
    const { libraryName } = get();
    if (!libraryName) return;

    try {
      const cats = await invoke<Category[]>("get_library_categories");
      set({ categories: cats });
    } catch (error) {
      console.error("Error fetching categories:", error);
      set({ categories: [] });
    }
  },

  fetchDocuments: async (page = 1, additionalParams?: URLSearchParams) => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    try {
      set({ loading: true, isSearching: false });

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

      const docs = data?.documents || [];
      const totalPages = Math.ceil(
        (data?.total_count || 0) / (data?.limit || query.limit)
      );
      const paginationData = {
        page: data?.page || query.page,
        limit: data?.limit || query.limit,
        totalCount: data?.total_count || 0,
        totalPages,
        hasNextPage: !!data?.has_next,
        hasPrevPage: !!data?.has_prev,
      };

      set({
        documents: docs,
        pagination: paginationData,
        filterOptions: data?.filter_options || {},
        isSearching: false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      set({ isSearching: false, loading: false });
    }
  },

  refreshLibraries: async () => {
    await get().fetchLibraries();
  },

  refreshData: async () => {
    const { currentPage, fetchDocuments, fetchCategories } = get();
    await Promise.all([fetchDocuments(currentPage), fetchCategories()]);
  },

  loadPage: async (page: number, extraFilters?: URLSearchParams) => {
    set({ currentPage: page });
    await get().fetchDocuments(page, extraFilters);
  },

  loadFilteredData: async () => {
    const { getFilterParams, getSortParams, fetchDocuments } = get();
    const combined = new URLSearchParams();
    getFilterParams().forEach((v, k) => combined.set(k, v));
    getSortParams().forEach((v, k) => combined.set(k, v));
    set({ currentPage: 1 });
    await fetchDocuments(1, combined);
  },

  // Document operations
  openDocument: async (doc: Document) => {
    try {
      await invoke("open_document", { documentId: doc.id });
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  },

  deleteDocument: async (document: Document) => {
    try {
      await invoke("delete_documents", { documentIds: [document.id] });
      await get().loadFilteredData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  },

  updateDocument: async (updatedDoc: Document): Promise<Document | undefined> => {
    try {
      const result = await invoke<Document>("update_document", {
        documentId: updatedDoc.id,
        metadata: updatedDoc.metadata,
      });
      await get().loadFilteredData();
      return result;
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
      return updatedDoc;
    }
  },

  toggleFavorite: async (document: Document) => {
    const updatedDoc = {
      ...document,
      metadata: {
        ...document.metadata,
        favorite: !document.metadata.favorite,
      },
    };
    return await get().updateDocument(updatedDoc);
  },

  // Library operations
  createLibrary: async (name: string, path: string): Promise<boolean> => {
    if (!name || !path) {
      toast.error("Please fill in all fields");
      return false;
    }

    try {
      await invoke("create_library", { name, path });
      await invoke("open_library", { libraryName: name });
      toast.success("Library created successfully");
      set({ libraryName: name });
      await get().refreshLibraries();
      return true;
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error(
        typeof error === "string" ? error : "Failed to create library"
      );
      return false;
    }
  },

  // Bulk operations
  bulkDelete: async () => {
    const { selectedDocuments, loadFilteredData, clearSelection, setSelectionMode } = get();
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{ deletedCount: number; errors?: unknown }>(
        "delete_documents",
        {
          documentIds: Array.from(selectedDocuments),
        }
      );

      toast.success(`Successfully deleted ${result.deletedCount} document(s)`);
      clearSelection();
      setSelectionMode(false);
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast.error("Failed to delete documents");
    }
  },

  bulkMove: async (doctype: string, category: string) => {
    const { selectedDocuments, loadFilteredData, clearSelection, setSelectionMode } = get();
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
      clearSelection();
      setSelectionMode(false);
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk moving documents:", error);
      toast.error("Failed to move documents");
    }
  },

  // UI helper functions
  resetCreateDialog: () =>
    set({
      newLibraryName: "",
      newLibraryPath: "",
      createLibraryOpen: false,
    }),

  openDocumentDialog: (document: Document) => {
    set({ selectedDocument: document, documentDialogOpen: true });
  },

  closeDocumentDialog: () => {
    set({ documentDialogOpen: false, selectedDocument: null });
  },

  handleDocumentClick: (document: Document) => {
    const { selectionMode, toggleDocumentSelection, openDocumentDialog } = get();
    if (selectionMode) {
      toggleDocumentSelection(document.id);
    } else {
      openDocumentDialog(document);
    }
  },

  handleDocumentUpdate: async (updatedDoc: Document): Promise<Document | undefined> => {
    const { updateDocument, setSelectedDocument } = get();
    const resultDoc = await updateDocument(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
    return resultDoc;
  },

  // Derived values
  getFilterParams: () => {
    const { filters } = get();
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
    if (filters.searchQuery) {
      params.set("search", filters.searchQuery);
    }
    if (filters.showFavoritesOnly) {
      params.set("favoritesOnly", "true");
    }

    return params;
  },

  getSortParams: () => {
    const { sortBy } = get();
    const params = new URLSearchParams();
    if (sortBy) {
      params.set("sortBy", sortBy);
    }
    return params;
  },

  getHasActiveFilters: () => {
    const { filters } = get();
    return !!(
      filters.selectedCategory ||
      filters.selectedKeywords.length ||
      filters.selectedFormats.length ||
      filters.selectedAuthors.length ||
      filters.selectedPublishers.length ||
      filters.selectedLanguages.length ||
      filters.searchQuery ||
      filters.showFavoritesOnly
    );
  },
}));

// Hook for debounced search
export function useDebouncedSearch() {
  const { filters, setSearchQuery, loadFilteredData } = useLibraryStore();
  const [debouncedQuery] = useDebounce(filters.searchQuery, 300);

  useEffect(() => {
    loadFilteredData();
  }, [debouncedQuery, loadFilteredData]);

  return { debouncedQuery, setSearchQuery };
}

// Hook for initial data loading
export function useLibraryInit() {
  const { fetchLibraries, libraryName, fetchCategories } = useLibraryStore();

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  useEffect(() => {
    if (libraryName) {
      fetchCategories();
    }
  }, [libraryName, fetchCategories]);
}


