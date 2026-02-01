"use client";

import { createContext, useContext, PropsWithChildren } from "react";
import { useImportStore, ImportItem, ImportBatch } from "@/stores/importStore";

export interface ImportContextType {
  currentBatch: ImportBatch | null;
  addBatch: (items: Omit<ImportItem, "id">[]) => string;
  updateItemStatus: (
    itemId: string,
    status: ImportItem["status"],
    options?: { completedAt?: Date; error?: string },
  ) => void;
  cancelItem: (itemId: string) => void;
  clearBatch: () => void;
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: PropsWithChildren) {
  const store = useImportStore();

  const value: ImportContextType = {
    currentBatch: store.currentBatch,
    addBatch: store.addBatch,
    updateItemStatus: store.updateItemStatus,
    cancelItem: store.cancelItem,
    clearBatch: store.clearBatch,
    importDialogOpen: store.importDialogOpen,
    setImportDialogOpen: store.setImportDialogOpen,
  };

  return (
    <ImportContext.Provider value={value}>{children}</ImportContext.Provider>
  );
}

export function useImportContext(): ImportContextType {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error("useImportContext must be used within an ImportProvider");
  }
  return context;
}

// Direct store export for components that want to use Zustand directly
export { useImportStore };
export type { ImportItem, ImportBatch };
