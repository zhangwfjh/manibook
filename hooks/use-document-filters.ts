import { useState, useMemo } from "react";
import { LibraryDocument } from "@/lib/library";

export function useDocumentFilters(documents: LibraryDocument[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      let matchesCategory = !selectedCategory;
      if (selectedCategory) {
        // Handle the new category structure: selectedCategory includes doctype prefix
        const selectedParts = selectedCategory.split(" > ");
        if (selectedParts.length >= 1) {
          const selectedDoctype = selectedParts[0];
          const selectedCategoryPath =
            selectedParts.length > 1 ? selectedParts.slice(1).join(" > ") : null;

          // Check if doctype matches
          const doctypeMatches = doc.metadata.doctype === selectedDoctype;
          // Check if category path matches (if specified)
          const categoryMatches =
            !selectedCategoryPath ||
            (doc.metadata.category &&
              doc.metadata.category.startsWith(selectedCategoryPath));

          matchesCategory = doctypeMatches && Boolean(categoryMatches);
        }
      }

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) =>
          doc.metadata.keywords?.some((kw) => kw === tag)
        );

      const matchesFormats =
        selectedFormats.length === 0 ||
        selectedFormats.includes(doc.metadata.format?.toUpperCase() || "");

      const matchesSearch =
        !searchQuery ||
        doc.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.authors?.some((author) =>
          author.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        doc.metadata.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesFavorites = !showFavoritesOnly || doc.metadata.favorite;

      return (
        matchesCategory &&
        matchesTags &&
        matchesFormats &&
        matchesSearch &&
        matchesFavorites
      );
    });
  }, [documents, selectedCategory, selectedTags, selectedFormats, searchQuery, showFavoritesOnly]);

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedTags([]);
    setSelectedFormats([]);
    setSearchQuery("");
    setShowFavoritesOnly(false);
  };

  return {
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    selectedFormats,
    setSelectedFormats,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filteredDocuments,
    resetFilters,
  };
}
