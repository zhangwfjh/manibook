import { useState, useEffect, useCallback, useRef } from "react";
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

interface CacheEntry {
  documents: LibraryDocument[];
  pagination: PaginationInfo | null;
  filterOptions: Record<string, Record<string, number>>;
  timestamp: number;
}

export function useLibraryData() {
  const [currentLibrary, setCurrentLibrary] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Default page size
  const [filterOptions, setFilterOptions] = useState<Record<string, Record<string, number>>>({});
  const lastFetchParamsRef = useRef<string>("");

  // Cache for API responses (5 minute TTL)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

  const fetchCategories = useCallback(async () => {
    if (!currentLibrary) return;
    try {
      const response = await fetch(`/api/libraries/${currentLibrary}/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  }, [currentLibrary]);

  const fetchLibraryData = useCallback(async (page: number = 1, additionalParams?: URLSearchParams) => {
    if (!currentLibrary) return;

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    const paramsString = params.toString();

    if (lastFetchParamsRef.current === paramsString) {
      return;
    }
    lastFetchParamsRef.current = paramsString;

    const cacheKey = `${currentLibrary}:${paramsString}`;

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Use cached data
      setDocuments(cached.documents);
      setPagination(cached.pagination);
      setFilterOptions(cached.filterOptions || {});
      setLoading(false);
      setIsFetching(false);
      return;
    }

    // Clear cache on first load to ensure fresh data
    if (cached) {
      cacheRef.current.delete(cacheKey);
    }

    try {
      setLoading(true);
      setIsFetching(true);

      // Single request for documents and filter options
      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents?${params.toString()}`
      );

      const data = await response.json();
      const documents = data.documents || [];
      const pagination = data.pagination || null;
      const filterOptionsData = data.filterOptions || {};

      // Cache the result
      cacheRef.current.set(cacheKey, {
        documents,
        pagination,
        filterOptions: filterOptionsData,
        timestamp: now
      });

      // Clean up old cache entries (keep only last 20)
      if (cacheRef.current.size > 20) {
        const entries = Array.from(cacheRef.current.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        cacheRef.current.clear();
        entries.slice(0, 15).forEach(([key, value]) => {
          cacheRef.current.set(key, value);
        });
      }

      setDocuments(documents);
      setPagination(pagination);
      setFilterOptions(filterOptionsData);
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [currentLibrary, pageSize, CACHE_TTL]);

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
      fetchCategories();
      lastFetchParamsRef.current = "";
    }
  }, [currentLibrary, fetchCategories]);

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
    // Clear cache when refreshing data
    cacheRef.current.clear();
    await Promise.all([
      fetchLibraryData(currentPage),
      fetchCategories()
    ]);
  }, [fetchLibraryData, fetchCategories, currentPage]);

  return {
    currentLibrary,
    setCurrentLibrary,
    libraries,
    documents,
    setDocuments,
    categories,
    loading,
    isFetching,
    pagination,
    currentPage,
    pageSize,
    loadPage,
    loadNextPage,
    loadPrevPage,
    loadFilteredData,
    refreshLibraries,
    refreshLibraryData,
    filterOptions,
  };
}
