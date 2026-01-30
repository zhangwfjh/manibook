import React, { createContext, useContext, ReactNode } from "react";
import { Document } from "@/lib/library";

interface DocumentActionsContextType {
  handleOpen: (doc: Document) => void;
  handleFavoriteToggle: (document: Document) => Promise<void>;
  handleDocumentDelete: (document: Document) => Promise<void>;
  handleDocumentUpdate: (updatedDoc: Document) => Promise<void>;
  handleToggleDocumentSelection: (documentId: string) => void;
  onDocumentClick: (document: Document) => void;
}

const DocumentActionsContext = createContext<
  DocumentActionsContextType | undefined
>(undefined);

interface DocumentActionsProviderProps {
  children: ReactNode;
  value: DocumentActionsContextType;
}

export function DocumentActionsProvider({
  children,
  value,
}: DocumentActionsProviderProps) {
  return (
    <DocumentActionsContext.Provider value={value}>
      {children}
    </DocumentActionsContext.Provider>
  );
}

export function useDocumentActionsContext(): DocumentActionsContextType {
  const context = useContext(DocumentActionsContext);
  if (context === undefined) {
    throw new Error(
      "useDocumentActionsContext must be used within a DocumentActionsProvider",
    );
  }
  return context;
}
