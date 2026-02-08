"use client";

import { create } from "zustand";
import type { Document } from "@/lib/library";
import { useLibraryOperations } from "./operations";
import { useLibraryDataStore } from "./dataStore";

interface UIState {
  sortBy: string;
  setSortBy: (sort: string) => Promise<void>;

  selectionMode: boolean;
  selectedDocuments: Set<string>;
  setSelectionMode: (mode: boolean) => void;
  setSelectedDocuments: (documents: Set<string>) => void;
  toggleSelectionMode: () => void;
  toggleDocumentSelection: (documentId: string) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;

  selectedDocument: Document | null;
  documentDialogOpen: boolean;
  setSelectedDocument: (document: Document | null) => void;
  setDocumentDialogOpen: (open: boolean) => void;
  openDocumentDialog: (document: Document) => void;
  closeDocumentDialog: () => void;

  createLibraryOpen: boolean;
  newLibraryName: string;
  newLibraryPath: string;
  setCreateLibraryOpen: (open: boolean) => void;
  setNewLibraryName: (name: string) => void;
  setNewLibraryPath: (path: string) => void;
  resetCreateDialog: () => void;

  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  handleDocumentClick: (document: Document, inSelectionMode: boolean) => void;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<Document | undefined>;
}

export const useLibraryUIStore = create<UIState>((set, get) => ({
  sortBy: "created_at-desc",
  setSortBy: async (sort) => {
    set({ sortBy: sort });
    const { loadFilteredData } = useLibraryOperations.getState();
    await loadFilteredData();
  },

  selectionMode: false,
  selectedDocuments: new Set(),
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSelectedDocuments: (documents) => set({ selectedDocuments: documents }),

  toggleSelectionMode: () =>
    set((state) => ({
      selectionMode: !state.selectionMode,
      selectedDocuments: new Set(),
    })),

  toggleDocumentSelection: (documentId) =>
    set((state) => {
      const newSet = new Set(state.selectedDocuments);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return { selectedDocuments: newSet };
    }),

  selectAllDocuments: () => {
    const { documents } = useLibraryDataStore.getState();
    set({ selectedDocuments: new Set(documents.map((doc) => doc.id)) });
  },

  clearSelection: () => set({ selectedDocuments: new Set() }),

  selectedDocument: null,
  documentDialogOpen: false,
  setSelectedDocument: (document) => set({ selectedDocument: document }),
  setDocumentDialogOpen: (open) => set({ documentDialogOpen: open }),

  openDocumentDialog: (document) => {
    set({ selectedDocument: document, documentDialogOpen: true });
  },

  closeDocumentDialog: () => {
    set({ documentDialogOpen: false, selectedDocument: null });
  },

  createLibraryOpen: false,
  newLibraryName: "",
  newLibraryPath: "",
  setCreateLibraryOpen: (open) => set({ createLibraryOpen: open }),
  setNewLibraryName: (name) => set({ newLibraryName: name }),
  setNewLibraryPath: (path) => set({ newLibraryPath: path }),

  resetCreateDialog: () =>
    set({
      newLibraryName: "",
      newLibraryPath: "",
      createLibraryOpen: false,
    }),

  bulkDeleteDialogOpen: false,
  setBulkDeleteDialogOpen: (open) => set({ bulkDeleteDialogOpen: open }),

  handleDocumentClick: (document, inSelectionMode) => {
    if (inSelectionMode) {
      get().toggleDocumentSelection(document.id);
    } else {
      get().openDocumentDialog(document);
    }
  },

  handleDocumentUpdate: async (updatedDoc) => {
    const { updateDocument } = useLibraryOperations.getState();
    const resultDoc = await updateDocument(updatedDoc);
    if (resultDoc) {
      set({ selectedDocument: resultDoc });
    }
    return resultDoc;
  },
}));
