"use client";

import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { useLibraryDataStore } from "@/stores/library/dataStore";
import { useLibraryFilterStore } from "@/stores/library/filterStore";
import { useLibraryOperations } from "@/stores/library/operations";

export function useLibraryInit() {
  const { fetchLibraries, libraryName, fetchCategories } = useLibraryDataStore();
  const { loadFilteredData } = useLibraryOperations();

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  useEffect(() => {
    if (libraryName) {
      fetchCategories();
      loadFilteredData();
    }
  }, [libraryName, fetchCategories, loadFilteredData]);
}

export function useDebouncedSearch() {
  const { searchQuery } = useLibraryFilterStore();
  const { loadFilteredData } = useLibraryOperations();
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadFilteredData();
  }, [debouncedQuery, loadFilteredData]);
}

// Hook that provides filter setters with auto-reload
export function useFilterWithReload() {
  const { setFilter } = useLibraryFilterStore();
  const { loadFilteredData } = useLibraryOperations();
  const { setCurrentPage } = useLibraryDataStore();

  const setSelectedCategory = async (category: string) => {
    setFilter("selectedCategory", category);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setSelectedKeywords = async (keywords: string[]) => {
    setFilter("selectedKeywords", keywords);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setSelectedFormats = async (formats: string[]) => {
    setFilter("selectedFormats", formats);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setSelectedAuthors = async (authors: string[]) => {
    setFilter("selectedAuthors", authors);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setSelectedPublishers = async (publishers: string[]) => {
    setFilter("selectedPublishers", publishers);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setSelectedLanguages = async (languages: string[]) => {
    setFilter("selectedLanguages", languages);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const setShowFavoritesOnly = async (show: boolean) => {
    setFilter("showFavoritesOnly", show);
    setCurrentPage(1);
    await loadFilteredData();
  };

  const resetFilters = async () => {
    setFilter("selectedCategory", "");
    setFilter("selectedKeywords", []);
    setFilter("selectedFormats", []);
    setFilter("selectedAuthors", []);
    setFilter("selectedPublishers", []);
    setFilter("selectedLanguages", []);
    setFilter("showFavoritesOnly", false);
    setFilter("searchQuery", "");
    setCurrentPage(1);
    await loadFilteredData();
  };

  return {
    setSelectedCategory,
    setSelectedKeywords,
    setSelectedFormats,
    setSelectedAuthors,
    setSelectedPublishers,
    setSelectedLanguages,
    setShowFavoritesOnly,
    resetFilters,
  };
}
