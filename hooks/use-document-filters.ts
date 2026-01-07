import { useState, useMemo, useCallback } from "react";
import { LibraryDocument } from "@/lib/library";

export function useDocumentFilters(documents: LibraryDocument[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Build filter parameters for API calls
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

    if (searchQuery) {
      params.set('search', searchQuery);
    }

    if (showFavoritesOnly) {
      params.set('favoritesOnly', 'true');
    }

    return params;
  }, [selectedCategory, selectedKeywords, selectedFormats, selectedAuthors, selectedPublishers, searchQuery, showFavoritesOnly]);

  // For backward compatibility, still provide filtered documents for components that need it
  // This will now only filter the current page's documents for display purposes
  const filteredDocuments = useMemo(() => {
    if (!documents.length) return [];

    return documents.filter((doc) => {
      // Since server-side filtering is now used, we mainly need to handle any remaining
      // client-side filtering that might be needed for the current page
      // Most filtering is now done server-side, so this is minimal

      let matchesCategory = !selectedCategory;
      if (selectedCategory) {
        const selectedParts = selectedCategory.split(" > ");
        if (selectedParts.length >= 1) {
          const selectedDoctype = selectedParts[0];
          const selectedCategoryPath =
            selectedParts.length > 1 ? selectedParts.slice(1).join(" > ") : null;

          const doctypeMatches = doc.metadata.doctype === selectedDoctype;
          const categoryMatches =
            !selectedCategoryPath ||
            (doc.metadata.category &&
              doc.metadata.category.startsWith(selectedCategoryPath));

          matchesCategory = doctypeMatches && Boolean(categoryMatches);
        }
      }

      // Most other filters are now handled server-side
      // Only check favorites here as it might need client-side filtering for current page
      const matchesFavorites = !showFavoritesOnly || doc.metadata.favorite;

      return matchesCategory && matchesFavorites;
    });
  }, [documents, selectedCategory, showFavoritesOnly]);

  const resetFilters = useCallback(() => {
    setSelectedCategory("");
    setSelectedKeywords([]);
    setSelectedFormats([]);
    setSelectedAuthors([]);
    setSelectedPublishers([]);
    setSearchQuery("");
    setShowFavoritesOnly(false);
  }, []);

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
    filteredDocuments,
    filterParams,
    hasActiveFilters,
    resetFilters,
  };
}
