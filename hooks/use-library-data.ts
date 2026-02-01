import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Document, Category, Library } from "@/lib/library";
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

export function useLibraryData() {
  const [libraryName, setLibraryName] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState<Record<string, Record<string, number>>>({});

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const pageSize = 50;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const fetchLibraryData = async (page: number = 1, additionalParams?: URLSearchParams) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());

    if (additionalParams) {
      additionalParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }

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

      if (isMountedRef.current) {
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

        setDocuments(documents);
        setPagination(pagination);
        setFilterOptions(filterOptionsData);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error fetching library data:", error);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Load libraries on mount
  useEffect(() => {
    fetchLibraries();
  }, []);

  // Load categories when library changes
  useEffect(() => {
    if (libraryName) {
      fetchCategories();
    }
  }, [libraryName]);

  const loadPage = async (page: number, filters?: URLSearchParams) => {
    setCurrentPage(page);
    await fetchLibraryData(page, filters);
  };

  const loadFilteredData = async (filterParams: URLSearchParams | undefined, sortParams: URLSearchParams | undefined) => {
    const combinedParams = new URLSearchParams();
    if (filterParams) {
      filterParams.forEach((value, key) => combinedParams.set(key, value));
    }
    if (sortParams) {
      sortParams.forEach((value, key) => combinedParams.set(key, value));
    }
    setCurrentPage(1);
    await fetchLibraryData(1, combinedParams);
  };

  const refreshLibraries = async () => {
    await fetchLibraries();
  };

  const refreshLibraryData = async () => {
    await Promise.all([
      fetchLibraryData(currentPage),
      fetchCategories()
    ]);
  };

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
