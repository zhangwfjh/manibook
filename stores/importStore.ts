"use client";

import { create } from "zustand";
import { ImportSource } from "@/lib/library/import-utils";

export interface ImportItem {
  id: string;
  filename: string;
  status: "pending" | "processing" | "success" | "failed" | "canceled";
  abortController?: AbortController;
  completedAt?: Date;
  error?: string;
  path?: string;
  source?: ImportSource;
  sourcePath?: string;
}

export interface ImportBatch {
  id: string;
  total: number;
  completed: number;
  failed: number;
  items: ImportItem[];
}

export interface SuccessfulImport {
  filename: string;
  path: string;
}

interface ImportStoreState {
  currentBatch: ImportBatch | null;
  importDialogOpen: boolean;

  importing: boolean;
  drawerOpen: boolean;
  deleteDialogOpen: boolean;
  successfulImports: SuccessfulImport[];
  activeTab: string;
  urls: string[];
  urlErrors: string[];

  setImportDialogOpen: (open: boolean) => void;
  addBatch: (items: Omit<ImportItem, "id">[]) => string;
  updateItemStatus: (
    itemId: string,
    status: ImportItem["status"],
    options?: { completedAt?: Date; error?: string; sourcePath?: string }
  ) => void;
  cancelItem: (itemId: string) => void;
  clearBatch: () => void;

  setImporting: (importing: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setSuccessfulImports: (imports: SuccessfulImport[]) => void;
  setActiveTab: (tab: string) => void;
  setUrls: (urls: string[]) => void;
  setUrlErrors: (errors: string[]) => void;
  addUrl: () => void;
  removeUrl: (index: number) => void;
  updateUrl: (index: number, value: string) => void;
  updateUrlError: (index: number, error: string) => void;
  resetUrlState: () => void;
  resetImportState: () => void;
}

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
  currentBatch: null,
  importDialogOpen: false,

  importing: false,
  drawerOpen: false,
  deleteDialogOpen: false,
  successfulImports: [],
  activeTab: "files",
  urls: [""],
  urlErrors: [""],

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

    let targetItem: ImportItem | undefined;
    const otherItems: ImportItem[] = [];

    currentBatch.items.forEach((item) => {
      if (item.id === itemId) {
        targetItem = { ...item, status, ...options };
      } else {
        otherItems.push(item);
      }
    });

    const updatedItems = targetItem
      ? [targetItem, ...otherItems]
      : otherItems;

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

  setImporting: (importing) => set({ importing }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  setDeleteDialogOpen: (open) => set({ deleteDialogOpen: open }),
  setSuccessfulImports: (imports) => set({ successfulImports: imports }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setUrls: (urls) => set({ urls }),
  setUrlErrors: (errors) => set({ urlErrors: errors }),

  addUrl: () => {
    const { urls, urlErrors } = get();
    set({
      urls: [...urls, ""],
      urlErrors: [...urlErrors, ""],
    });
  },

  removeUrl: (index) => {
    const { urls, urlErrors } = get();
    const newUrls = urls.filter((_, i) => i !== index);
    const newErrors = urlErrors.filter((_, i) => i !== index);
    set({
      urls: newUrls.length > 0 ? newUrls : [""],
      urlErrors: newErrors.length > 0 ? newErrors : [""],
    });
  },

  updateUrl: (index, value) => {
    const { urls, urlErrors } = get();
    const newUrls = [...urls];
    newUrls[index] = value;
    set({ urls: newUrls });

    if (urlErrors[index]) {
      const newErrors = [...urlErrors];
      newErrors[index] = "";
      set({ urlErrors: newErrors });
    }
  },

  updateUrlError: (index, error) => {
    const { urlErrors } = get();
    const newErrors = [...urlErrors];
    newErrors[index] = error;
    set({ urlErrors: newErrors });
  },

  resetUrlState: () =>
    set({
      urls: [""],
      urlErrors: [""],
    }),

  resetImportState: () =>
    set({
      importing: false,
      drawerOpen: false,
      deleteDialogOpen: false,
      successfulImports: [],
      activeTab: "files",
      urls: [""],
      urlErrors: [""],
    }),
}));