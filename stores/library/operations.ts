"use client";

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import type { Document } from "@/lib/library";
import { useLibraryDataStore } from "./dataStore";
import { useLibraryFilterStore } from "./filterStore";
import { useLibraryUIStore } from "./uiStore";


interface DocumentsResponse {
  documents: Document[];
  total_count: number;
  limit: number;
  page: number;
  has_next: boolean;
  has_prev: boolean;
  filter_options?: Record<string, Record<string, number>>;
}

interface OperationsState {
  fetchDocuments: (page?: number, additionalParams?: URLSearchParams) => Promise<void>;
  refreshLibraries: () => Promise<void>;
  refreshData: () => Promise<void>;
  loadPage: (page: number, extraFilters?: URLSearchParams) => Promise<void>;
  loadFilteredData: () => Promise<void>;
  openDocument: (doc: Document) => Promise<void>;
  deleteDocument: (document: Document) => Promise<void>;
  updateDocument: (updatedDoc: Document) => Promise<Document | undefined>;
  toggleFavorite: (document: Document) => Promise<Document | undefined>;
  createLibrary: (name: string, path: string) => Promise<boolean>;
  bulkDelete: (documentIds: string[]) => Promise<void>;
  bulkMove: (documentIds: string[], doctype: string, category: string) => Promise<void>;
}

const pageSize = 50;

export const useLibraryOperations = create<OperationsState>((set, get) => ({
  fetchDocuments: async (page = 1, additionalParams) => {
    const { setDocuments, setLoading, setPagination, setFilterOptions, setCurrentPage } =
      useLibraryDataStore.getState();
    const { setIsSearching } = useLibraryFilterStore.getState();

    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => params.set(key, value));
    }

    try {
      setLoading(true);
      setIsSearching(false);

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

      setDocuments(docs);
      setPagination({
        page: data?.page || query.page,
        limit: data?.limit || query.limit,
        totalCount: data?.total_count || 0,
        totalPages,
        hasNextPage: !!data?.has_next,
        hasPrevPage: !!data?.has_prev,
      });
      setFilterOptions(data?.filter_options || {});
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  },

  refreshLibraries: async () => {
    const { fetchLibraries } = useLibraryDataStore.getState();
    await fetchLibraries();
  },

  refreshData: async () => {
    const { fetchCategories, currentPage } = useLibraryDataStore.getState();
    const { fetchDocuments } = get();

    await Promise.all([fetchDocuments(currentPage), fetchCategories()]);
  },

  loadPage: async (page, extraFilters) => {
    const { fetchDocuments } = get();
    await fetchDocuments(page, extraFilters);
  },

  loadFilteredData: async () => {
    const { getFilterParams } = useLibraryFilterStore.getState();
    const { fetchDocuments } = get();
    const { sortBy } = useLibraryUIStore.getState();

    const params = getFilterParams();
    if (sortBy) params.set("sortBy", sortBy);

    useLibraryDataStore.setState({ currentPage: 1 });
    await fetchDocuments(1, params);
  },

  openDocument: async (doc) => {
    try {
      await invoke("open_document", { documentId: doc.id });
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  },

  deleteDocument: async (document) => {
    try {
      await invoke("delete_documents", { documentIds: [document.id] });
      const { loadFilteredData } = get();
      await loadFilteredData();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  },

  updateDocument: async (updatedDoc): Promise<Document | undefined> => {
    try {
      const result = await invoke<Document>("update_document", {
        documentId: updatedDoc.id,
        metadata: updatedDoc.metadata,
      });
      const { loadFilteredData } = get();
      await loadFilteredData();
      return result;
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
      return updatedDoc;
    }
  },

  toggleFavorite: async (document): Promise<Document | undefined> => {
    const updatedDoc = {
      ...document,
      metadata: {
        ...document.metadata,
        favorite: !document.metadata.favorite,
      },
    };
    const { updateDocument } = get();
    return await updateDocument(updatedDoc);
  },

  createLibrary: async (name, path) => {
    if (!name || !path) {
      toast.error("Please fill in all fields");
      return false;
    }

    try {
      await invoke("create_library", { name, path });
      await invoke("open_library", { libraryName: name });
      toast.success("Library created successfully");

      useLibraryDataStore.setState({ libraryName: name });
      const { refreshLibraries } = get();
      await refreshLibraries();
      return true;
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error(typeof error === "string" ? error : "Failed to create library");
      return false;
    }
  },

  bulkDelete: async (documentIds) => {
    if (documentIds.length === 0) return;

    try {
      const result = await invoke<{ deletedCount: number; errors?: unknown }>(
        "delete_documents",
        { documentIds }
      );
      toast.success(`Successfully deleted ${result.deletedCount} document(s)`);

      const { loadFilteredData } = get();
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast.error("Failed to delete documents");
    }
  },

  bulkMove: async (documentIds, doctype, category) => {
    if (documentIds.length === 0) return;

    try {
      const result = await invoke<{
        movedCount: number;
        errorCount: number;
        errors?: unknown;
      }>("move_documents", { documentIds, doctype, category });

      toast.success(`Successfully moved ${result.movedCount} document(s)`);
      if (result.errorCount > 0) {
        toast.error(`Failed to move ${result.errorCount} document(s)`);
      }

      const { loadFilteredData } = get();
      await loadFilteredData();
    } catch (error) {
      console.error("Error bulk moving documents:", error);
      toast.error("Failed to move documents");
    }
  },
}));
