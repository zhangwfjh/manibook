import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Document, Category, Library } from "@/lib/library";
import { PaginationInfo } from "@/lib/library/types";

interface CacheEntry {
  documents: Document[];
  pagination: PaginationInfo | null;
  filterOptions: Record<string, Record<string, number>>;
  timestamp: number;
}

interface DocumentsResponse {
  documents: Document[];
  total_count: number;
  limit: number;
  page: number;
  has_next: boolean;
  has_prev: boolean;
  filter_options?: Record<string, Record<string, number>>;
}

export function useLibraryData() {
  const [libraryName, setLibraryName] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState<Record<string, Record<string, number>>>({});
  const lastFetchParamsRef = useRef<string>("");

  // Cache for API responses (5 minute TTL)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const pageSize = 50; // Default page size

  const fetchLibraries = useCallback(async () => {
    try {
      const libs = await invoke<Library[]>("get_libraries");
      setLibraries(libs);
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const categories = await invoke<Category[]>("get_library_categories");
      setCategories(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    }
  }, []);

  const fetchLibraryData = useCallback(async (page: number = 1, additionalParams?: URLSearchParams, forceRefresh: boolean = false) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    const paramsString = params.toString();

    if (!forceRefresh && lastFetchParamsRef.current === paramsString) {
      return;
    }
    lastFetchParamsRef.current = paramsString;

    const cacheKey = `${libraryName}:${paramsString}`;

    // Check cache first (skip if forceRefresh)
    const cached = cacheRef.current.get(cacheKey);
    const now = Date.now();
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      // Use cached data
      setDocuments(cached.documents);
      setPagination(cached.pagination);
      setFilterOptions(cached.filterOptions || {});
      setLoading(false);
      return;
    }

    // Clear cache on first load or force refresh to ensure fresh data
    if (cached || forceRefresh) {
      cacheRef.current.delete(cacheKey);
    }

    try {
      setLoading(true);

      // Build query object
      const query = {
        page: parseInt(params.get('page') || '1'),
        limit: Math.min(parseInt(params.get('limit') || '50'), 200),
        category: params.get('category') || undefined,
        search_query: params.get('search') || undefined,
        keywords: (params.get('keywords')?.split(',').filter(Boolean) || []),
        formats: (params.get('formats')?.split(',').filter(Boolean) || []),
        authors: (params.get('authors')?.split(',').filter(Boolean) || []),
        publishers: (params.get('publishers')?.split(',').filter(Boolean) || []),
        languages: (params.get('languages')?.split(',').filter(Boolean) || []),
        favorites_only: params.get('favoritesOnly') === 'true',
        sort_by: params.get('sortBy') || 'createdAt-desc',
      };

      const data = await invoke<DocumentsResponse>('get_documents', { query });
      const documents = data?.documents || [];
      const totalPages = Math.ceil((data?.total_count || 0) / (data?.limit || query.limit));
      const pagination = {
        page: data?.page || query.page,
        limit: data?.limit || query.limit,
        totalCount: data?.total_count || 0,
        totalPages,
        hasNextPage: !!data?.has_next,
        hasPrevPage: !!data?.has_prev,
      };
      const filterOptionsData = data?.filter_options || {};

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
    }
  }, [libraryName, CACHE_TTL]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  useEffect(() => {
    if (libraryName) {
      fetchCategories();
      lastFetchParamsRef.current = "";
    }
  }, [libraryName, fetchCategories]);

  // Load specific page
  const loadPage = useCallback(async (page: number, filters?: URLSearchParams) => {
    setCurrentPage(page);
    await fetchLibraryData(page, filters);
  }, [fetchLibraryData]);

  // Load filtered data
  const loadFilteredData = useCallback(async (filterParams: URLSearchParams | undefined, sortParams: URLSearchParams | undefined, forceRefresh: boolean = false) => {
    const combinedParams = new URLSearchParams();
    if (filterParams) {
      filterParams.forEach((value, key) => combinedParams.set(key, value));
    }
    if (sortParams) {
      sortParams.forEach((value, key) => combinedParams.set(key, value));
    }
    setCurrentPage(1);
    await fetchLibraryData(1, combinedParams, forceRefresh);
  }, [fetchLibraryData]);

  const refreshLibraries = useCallback(async () => {
    await fetchLibraries();
  }, [fetchLibraries]);

  const refreshLibraryData = useCallback(async () => {
    // Clear cache when refreshing data
    cacheRef.current.clear();
    lastFetchParamsRef.current = "";
    await Promise.all([
      fetchLibraryData(currentPage),
      fetchCategories()
    ]);
  }, [fetchLibraryData, fetchCategories, currentPage]);

  return {
    libraryName,
    setLibraryName,
    libraries,
    documents,
    categories,
    loading,
    pagination,
    currentPage,
    loadPage,
    loadFilteredData,
    refreshLibraries,
    refreshLibraryData,
    filterOptions,
  };
}
