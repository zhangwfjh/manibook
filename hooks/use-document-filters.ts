import { useState, useMemo, useCallback } from "react";
import { useDebouncedSearch } from "./use-debounced-search";

export function useDocumentFilters() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Use debounced search for the search query
  const {
    searchValue: searchQuery,
    debouncedSearchValue: debouncedSearchQuery,
    updateSearch: setSearchQuery,
    isSearching,
  } = useDebouncedSearch("", 300);

  // Build filter parameters for API calls (using debounced search value)
  const filterParams = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedCategory) {
      params.set('category', selectedCategory);
    }

    if (selectedKeywords.length > 0) {
      params.set('keywords', selectedKeywords.join(','));
    }

    if (selectedFormats.length > 0) {
      params.set('formats', selectedFormats.join(','));
    }

    if (selectedAuthors.length > 0) {
      params.set('authors', selectedAuthors.join(','));
    }

    if (selectedPublishers.length > 0) {
      params.set('publishers', selectedPublishers.join(','));
    }

    if (debouncedSearchQuery) {
      params.set('search', debouncedSearchQuery);
    }

    if (showFavoritesOnly) {
      params.set('favoritesOnly', 'true');
    }

    return params;
  }, [selectedCategory, selectedKeywords, selectedFormats, selectedAuthors, selectedPublishers, debouncedSearchQuery, showFavoritesOnly]);

  const resetFilters = useCallback(() => {
    setSelectedCategory("");
    setSelectedKeywords([]);
    setSelectedFormats([]);
    setSelectedAuthors([]);
    setSelectedPublishers([]);
    setSearchQuery("");
    setShowFavoritesOnly(false);
  }, [setSearchQuery]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(selectedCategory || selectedKeywords.length || selectedFormats.length ||
      selectedAuthors.length || selectedPublishers.length || searchQuery || showFavoritesOnly);
  }, [selectedCategory, selectedKeywords, selectedFormats, selectedAuthors, selectedPublishers, searchQuery, showFavoritesOnly]);

  return {
    selectedCategory,
    setSelectedCategory,
    selectedKeywords,
    setSelectedKeywords,
    selectedFormats,
    setSelectedFormats,
    selectedAuthors,
    setSelectedAuthors,
    selectedPublishers,
    setSelectedPublishers,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filterParams,
    hasActiveFilters,
    resetFilters,
    isSearching,
  };
}
