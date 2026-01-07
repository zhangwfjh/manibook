import { useState, useEffect, useCallback } from "react";
import { LibraryDocument, LibraryCategory } from "@/lib/library";
import { Library } from "@/lib/library";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function useLibraryData() {
  const [currentLibrary, setCurrentLibrary] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Default page size

  const fetchLibraries = useCallback(async () => {
    try {
      const response = await fetch("/api/libraries");
      const data = await response.json();
      const libs = data.libraries || [];
      setLibraries(libs);
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }, []);

  const fetchLibraryData = useCallback(async (page: number = 1, additionalParams?: URLSearchParams) => {
    if (!currentLibrary) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', pageSize.toString());

      if (additionalParams) {
        additionalParams.forEach((value, key) => {
          params.set(key, value);
        });
      }

      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents?${params.toString()}`
      );
      const data = await response.json();
      setDocuments(data.documents || []);
      setPagination(data.pagination || null);
      // Note: categories are no longer returned from the paginated API
      // They will need to be fetched separately if needed
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentLibrary, pageSize]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  useEffect(() => {
    if (libraries.length > 0 && !currentLibrary) {
      setCurrentLibrary(libraries[0].name);
    }
  }, [libraries, currentLibrary]);

  useEffect(() => {
    if (currentLibrary) {
      setDocuments([]);
      setCurrentPage(1);
      fetchLibraryData(1);
    }
  }, [currentLibrary, fetchLibraryData]);

  // Load specific page
  const loadPage = useCallback(async (page: number, filters?: URLSearchParams) => {
    setCurrentPage(page);
    await fetchLibraryData(page, filters);
  }, [fetchLibraryData]);

  // Load next page
  const loadNextPage = useCallback(async () => {
    if (pagination?.hasNextPage) {
      await loadPage(currentPage + 1);
    }
  }, [pagination?.hasNextPage, currentPage, loadPage]);

  // Load previous page
  const loadPrevPage = useCallback(async () => {
    if (pagination?.hasPrevPage) {
      await loadPage(currentPage - 1);
    }
  }, [pagination?.hasPrevPage, currentPage, loadPage]);

  // Load filtered data
  const loadFilteredData = useCallback(async (filters: URLSearchParams) => {
    setCurrentPage(1);
    await fetchLibraryData(1, filters);
  }, [fetchLibraryData]);

  const refreshLibraries = useCallback(async () => {
    await fetchLibraries();
  }, [fetchLibraries]);

  const refreshLibraryData = useCallback(async () => {
    await fetchLibraryData(currentPage);
  }, [fetchLibraryData, currentPage]);

  return {
    currentLibrary,
    setCurrentLibrary,
    libraries,
    documents,
    setDocuments,
    categories,
    loading,
    pagination,
    currentPage,
    pageSize,
    loadPage,
    loadNextPage,
    loadPrevPage,
    loadFilteredData,
    refreshLibraries,
    refreshLibraryData,
  };
}
