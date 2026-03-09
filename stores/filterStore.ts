"use client";

import { create } from "zustand";
import { initialFilters, type FilterState } from "./types";

interface FilterStateStore extends FilterState {
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;
  getFilterParams: () => URLSearchParams;
  hasActiveFilters: () => boolean;
}

export const useLibraryFilterStore = create<FilterStateStore>((set, get) => ({
  ...initialFilters,
  isSearching: false,

  setIsSearching: (isSearching) => set({ isSearching }),

  setFilter: (key, value) => {
    set((state) => ({ ...state, [key]: value }));
  },

  resetFilters: () => {
    set(initialFilters);
  },

  setSearchQuery: (query) => {
    get().setFilter("searchQuery", query);
  },

  getFilterParams: () => {
    const state = get();
    const params = new URLSearchParams();

    if (state.selectedCategory) params.set("category", state.selectedCategory);
    if (state.selectedKeywords.length)
      params.set("keywords", state.selectedKeywords.join(","));
    if (state.selectedFormats.length)
      params.set("formats", state.selectedFormats.join(","));
    if (state.selectedAuthors.length)
      params.set("authors", state.selectedAuthors.join(","));
    if (state.selectedPublishers.length)
      params.set("publishers", state.selectedPublishers.join(","));
    if (state.selectedLanguages.length)
      params.set("languages", state.selectedLanguages.join(","));
    if (state.searchQuery) params.set("search", state.searchQuery);
    if (state.showFavoritesOnly) params.set("favoritesOnly", "true");

    return params;
  },

  hasActiveFilters: () => {
    const state = get();
    return !!(
      state.selectedCategory ||
      state.selectedKeywords.length ||
      state.selectedFormats.length ||
      state.selectedAuthors.length ||
      state.selectedPublishers.length ||
      state.selectedLanguages.length ||
      state.searchQuery ||
      state.showFavoritesOnly
    );
  },
}));