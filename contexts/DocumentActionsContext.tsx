import React, { createContext, useContext, ReactNode } from "react";
import { LibraryDocument } from "@/lib/library";

interface DocumentActionsContextType {
  handleOpen: (doc: LibraryDocument) => void;
  handleFavoriteToggle: (document: LibraryDocument) => Promise<void>;
  handleDocumentDelete: (document: LibraryDocument) => Promise<void>;
  handleDocumentUpdate: (updatedDoc: LibraryDocument) => Promise<void>;
  handleToggleDocumentSelection: (documentId: string) => void;
  onDocumentClick: (document: LibraryDocument) => void;
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
      "useDocumentActionsContext must be used within a DocumentActionsProvider"
    );
  }
  return context;
}
