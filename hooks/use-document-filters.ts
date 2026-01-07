import { useState, useMemo } from "react";
import { LibraryDocument } from "@/lib/library";

export function useDocumentFilters(documents: LibraryDocument[]) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<string[]>([]);
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

      const matchesKeywords =
        selectedKeywords.length === 0 ||
        selectedKeywords.some((keyword) =>
          doc.metadata.keywords?.some((kw) => kw === keyword)
        );

      const matchesFormats =
        selectedFormats.length === 0 ||
        selectedFormats.includes(doc.metadata.format?.toUpperCase() || "");

      const matchesAuthors =
        selectedAuthors.length === 0 ||
        selectedAuthors.some((author) =>
          doc.metadata.authors?.some((docAuthor) => docAuthor === author)
        );

      const matchesPublishers =
        selectedPublishers.length === 0 ||
        selectedPublishers.includes(doc.metadata.publisher || "");

      const matchesSearch =
        !searchQuery ||
        doc.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.metadata.authors?.some((author) =>
          author.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        doc.metadata.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        doc.metadata.publisher?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFavorites = !showFavoritesOnly || doc.metadata.favorite;

      return (
        matchesCategory &&
        matchesKeywords &&
        matchesFormats &&
        matchesAuthors &&
        matchesPublishers &&
        matchesSearch &&
        matchesFavorites
      );
    });
  }, [documents, selectedCategory, selectedKeywords, selectedFormats, selectedAuthors, selectedPublishers, searchQuery, showFavoritesOnly]);

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedKeywords([]);
    setSelectedFormats([]);
    setSelectedAuthors([]);
    setSelectedPublishers([]);
    setSearchQuery("");
    setShowFavoritesOnly(false);
  };

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
    resetFilters,
  };
}
