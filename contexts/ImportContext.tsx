import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react";

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

export interface ImportContextType {
  currentBatch: ImportBatch | null;
  addBatch: (items: Omit<ImportItem, "id">[]) => string;
  updateItemStatus: (
    itemId: string,
    status: ImportItem["status"],
    options?: { completedAt?: Date; error?: string; path?: string }
  ) => void;
  cancelItem: (itemId: string) => void;
  clearBatch: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

interface ImportProviderProps {
  children: ReactNode;
}

export function ImportProvider({ children }: ImportProviderProps) {
  const [currentBatch, setCurrentBatch] = useState<ImportBatch | null>(null);

  const addBatch = useCallback((items: Omit<ImportItem, "id">[]) => {
    const batchId = `batch-${Date.now()}`;
    const importItems: ImportItem[] = items.map((item, index) => ({
      ...item,
      id: `${batchId}-item-${index}`,
    }));

    const newBatch: ImportBatch = {
      id: batchId,
      total: importItems.length,
      completed: 0,
      failed: 0,
      items: importItems,
    };

    setCurrentBatch(newBatch);
    return batchId;
  }, []);

  const updateItemStatus = useCallback(
    (
      itemId: string,
      status: ImportItem["status"],
      options?: { completedAt?: Date; error?: string }
    ) => {
      setCurrentBatch((prevBatch) => {
        if (!prevBatch) return null;

        const updatedItems = prevBatch.items.map((item) =>
          item.id === itemId ? { ...item, status, ...options } : item
        );

        let completed = 0;
        let failed = 0;
        updatedItems.forEach((item) => {
          if (item.status === "success") completed++;
          if (item.status === "failed" || item.status === "canceled") failed++;
        });

        return {
          ...prevBatch,
          completed,
          failed,
          items: updatedItems,
        };
      });
    },
    []
  );

  const cancelItem = useCallback((itemId: string) => {
    setCurrentBatch((prevBatch) => {
      if (!prevBatch) return null;

      const updatedItems = prevBatch.items.map((item) => {
        if (item.id === itemId) {
          item.abortController?.abort();
          return { ...item, status: "canceled" as const };
        }
        return item;
      });

      let completed = 0;
      let failed = 0;
      updatedItems.forEach((item) => {
        if (item.status === "success") completed++;
        if (item.status === "failed" || item.status === "canceled") failed++;
      });

      return {
        ...prevBatch,
        completed,
        failed,
        items: updatedItems,
      };
    });
  }, []);

  const clearBatch = useCallback(() => {
    setCurrentBatch(null);
  }, []);

  const value: ImportContextType = {
    currentBatch,
    addBatch,
    updateItemStatus,
    cancelItem,
    clearBatch,
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
