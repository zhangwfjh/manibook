"use client";

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FilterOptions } from "./types";
import type { Document, Library, Category, PaginationInfo } from "@/lib/library";

interface DataState {
  libraryName: string;
  libraries: Library[];
  documents: Document[];
  categories: Category[];
  loading: boolean;
  pagination: PaginationInfo | null;
  currentPage: number;
  filterOptions: FilterOptions;
}

interface DataActions {
  setLibraryName: (name: string) => void;
  setLibraries: (libraries: Library[]) => void;
  setDocuments: (documents: Document[]) => void;
  setCategories: (categories: Category[]) => void;
  setLoading: (loading: boolean) => void;
  setPagination: (pagination: PaginationInfo | null) => void;
  setCurrentPage: (page: number) => void;
  setFilterOptions: (options: FilterOptions) => void;
  fetchLibraries: () => Promise<void>;
  fetchCategories: () => Promise<void>;
}

export const useLibraryDataStore = create<DataState & DataActions>((set) => ({
  libraryName: "",
  libraries: [],
  documents: [],
  categories: [],
  loading: true,
  pagination: null,
  currentPage: 1,
  filterOptions: {},

  setLibraryName: (name) => set({ libraryName: name }),
  setLibraries: (libraries) => set({ libraries }),
  setDocuments: (documents) => set({ documents }),
  setCategories: (categories) => set({ categories }),
  setLoading: (loading) => set({ loading }),
  setPagination: (pagination) => set({ pagination }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setFilterOptions: (options) => set({ filterOptions: options }),

  fetchLibraries: async () => {
    try {
      const libs = await invoke<Library[]>("get_libraries");
      set({ libraries: libs });
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  },

  fetchCategories: async () => {
    try {
      const cats = await invoke<Category[]>("get_library_categories");
      set({ categories: cats });
    } catch (error) {
      console.error("Error fetching categories:", error);
      set({ categories: [] });
    }
  },
}));
