import React, { createContext, useContext, ReactNode } from "react";
import { Document } from "@/lib/library";

interface DialogContextType {
  selectedDocument: Document | null;
  setSelectedDocument: (document: Document | null) => void;
  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;

  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;

  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;

  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  resetCreateDialog: () => void;
  resetBulkDeleteDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [selectedDocument, setSelectedDocument] =
    React.useState<Document | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = React.useState(false);

  const [createLibraryOpen, setCreateLibraryOpen] = React.useState(false);
  const [newLibraryName, setNewLibraryName] = React.useState("");
  const [newLibraryPath, setNewLibraryPath] = React.useState("");

  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);

  const resetCreateDialog = () => {
    setNewLibraryName("");
    setNewLibraryPath("");
    setCreateLibraryOpen(false);
  };

  const resetBulkDeleteDialog = () => {
    setBulkDeleteDialogOpen(false);
  };

  const value: DialogContextType = {
    selectedDocument,
    setSelectedDocument,
    documentDialogOpen,
    setDocumentDialogOpen,

    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,

    importDialogOpen,
    setImportDialogOpen,

    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,

    resetCreateDialog,
    resetBulkDeleteDialog,
  };

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

export function useDialogContext(): DialogContextType {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialogContext must be used within a DialogProvider");
  }
  return context;
}
