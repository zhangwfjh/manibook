"use client";

import { create } from "zustand";

export interface ImportItem {
  id: string;
  filename: string;
  status: "importing" | "success" | "failed" | "canceled";
  abortController?: AbortController;
  completedAt?: Date;
  error?: string;
  path?: string;
}

export interface ImportBatch {
  id: string;
  total: number;
  completed: number;
  failed: number;
  items: ImportItem[];
}

interface ImportStoreState {
  currentBatch: ImportBatch | null;
  importDialogOpen: boolean;

  // Actions
  setImportDialogOpen: (open: boolean) => void;
  addBatch: (items: Omit<ImportItem, "id">[]) => string;
  updateItemStatus: (
    itemId: string,
    status: ImportItem["status"],
    options?: { completedAt?: Date; error?: string }
  ) => void;
  cancelItem: (itemId: string) => void;
  clearBatch: () => void;
}

// Helper to count completed and failed items
function countItemStats(items: ImportItem[]) {
  let completed = 0;
  let failed = 0;
  items.forEach((item) => {
    if (item.status === "success") completed++;
    if (item.status === "failed" || item.status === "canceled") failed++;
  });
  return { completed, failed };
}

export const useImportStore = create<ImportStoreState>((set, get) => ({
  // Initial state
  currentBatch: null,
  importDialogOpen: false,

  // Actions
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),

  addBatch: (items) => {
    const batchId = `batch-${Date.now()}`;
    const importItems: ImportItem[] = items.map((item, index) => ({
      ...item,
      id: `${batchId}-item-${index}`,
    }));

    set({
      currentBatch: {
        id: batchId,
        total: importItems.length,
        completed: 0,
        failed: 0,
        items: importItems,
      },
    });
    return batchId;
  },

  updateItemStatus: (itemId, status, options) => {
    const { currentBatch } = get();
    if (!currentBatch) return;

    const updatedItems = currentBatch.items.map((item) =>
      item.id === itemId ? { ...item, status, ...options } : item
    );

    const { completed, failed } = countItemStats(updatedItems);

    set({
      currentBatch: {
        ...currentBatch,
        completed,
        failed,
        items: updatedItems,
      },
    });
  },

  cancelItem: (itemId) => {
    const { currentBatch } = get();
    if (!currentBatch) return;

    const updatedItems = currentBatch.items.map((item): ImportItem => {
      if (item.id === itemId) {
        item.abortController?.abort();
        return { ...item, status: "canceled" };
      }
      return item;
    });

    const { completed, failed } = countItemStats(updatedItems);

    set({
      currentBatch: {
        ...currentBatch,
        completed,
        failed,
        items: updatedItems,
      },
    });
  },

  clearBatch: () => set({ currentBatch: null }),
}));
