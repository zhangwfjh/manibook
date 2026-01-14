import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { SelectionState } from "../types";

const SelectionContext = createContext<SelectionState | undefined>(undefined);

interface SelectionProviderProps {
  children: ReactNode;
}

export function SelectionProvider({ children }: SelectionProviderProps) {
  const [mode, setMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  const toggleMode = useCallback(() => {
    setMode(prev => !prev);
    if (mode) {
      // Exiting selection mode, clear selection
      setSelectedDocuments(new Set());
    }
  }, [mode]);

  const toggleSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDocuments(new Set());
  }, []);

  const selectAll = useCallback((documentIds: string[]) => {
    setSelectedDocuments(new Set(documentIds));
  }, []);

  const isSelected = useCallback((documentId: string) => {
    return selectedDocuments.has(documentId);
  }, [selectedDocuments]);

  const selectedCount = selectedDocuments.size;

  const value: SelectionState = {
    mode,
    selectedDocuments,
    toggleMode,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected,
    selectedCount,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}