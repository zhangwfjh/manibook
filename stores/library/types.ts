export type { Document, Library, Category, PaginationInfo } from "@/lib/library";

export interface FilterOptions {
  [key: string]: Record<string, number> | undefined;
}

export interface FilterState {
  selectedCategory: string;
  selectedKeywords: string[];
  selectedFormats: string[];
  selectedAuthors: string[];
  selectedPublishers: string[];
  selectedLanguages: string[];
  showFavoritesOnly: boolean;
  searchQuery: string;
}

export const initialFilters: FilterState = {
  selectedCategory: "",
  selectedKeywords: [],
  selectedFormats: [],
  selectedAuthors: [],
  selectedPublishers: [],
  selectedLanguages: [],
  showFavoritesOnly: false,
  searchQuery: "",
};
