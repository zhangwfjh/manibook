import React, { createContext, useContext, ReactNode } from "react";
import { LibraryDocument } from "@/lib/library";

interface DialogContextType {
  // Document detail dialog
  selectedDocument: LibraryDocument | null;
  setSelectedDocument: (document: LibraryDocument | null) => void;
  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;

  // Library dialogs
  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;

  renameLibraryOpen: boolean;
  setRenameLibraryOpen: (open: boolean) => void;
  selectedLibraryForOperation: { name: string; path?: string };
  setSelectedLibraryForOperation: (library: {
    name: string;
    path?: string;
  }) => void;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;

  moveLibraryOpen: boolean;
  setMoveLibraryOpen: (open: boolean) => void;
  moveLibraryPath: string;
  setMoveLibraryPath: (path: string) => void;

  archiveLibraryOpen: boolean;
  setArchiveLibraryOpen: (open: boolean) => void;

  // Import dialog
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;

  // Bulk delete
  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  // Reset functions
  resetCreateDialog: () => void;
  resetRenameDialog: () => void;
  resetMoveDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  // Document detail dialog state
  const [selectedDocument, setSelectedDocument] =
    React.useState<LibraryDocument | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = React.useState(false);

  // Create library dialog state
  const [createLibraryOpen, setCreateLibraryOpen] = React.useState(false);
  const [newLibraryName, setNewLibraryName] = React.useState("");
  const [newLibraryPath, setNewLibraryPath] = React.useState("");

  // Rename library dialog state
  const [renameLibraryOpen, setRenameLibraryOpen] = React.useState(false);
  const [selectedLibraryForOperation, setSelectedLibraryForOperation] =
    React.useState<{ name: string; path?: string }>({ name: "" });
  const [renameLibraryName, setRenameLibraryName] = React.useState("");

  // Move library dialog state
  const [moveLibraryOpen, setMoveLibraryOpen] = React.useState(false);
  const [moveLibraryPath, setMoveLibraryPath] = React.useState("");

  // Archive library dialog state
  const [archiveLibraryOpen, setArchiveLibraryOpen] = React.useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  // Bulk delete dialog state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);

  // Reset functions
  const resetCreateDialog = () => {
    setNewLibraryName("");
    setNewLibraryPath("");
    setCreateLibraryOpen(false);
  };

  const resetRenameDialog = () => {
    setRenameLibraryName("");
    setSelectedLibraryForOperation({ name: "" });
    setRenameLibraryOpen(false);
  };

  const resetMoveDialog = () => {
    setMoveLibraryPath("");
    setSelectedLibraryForOperation({ name: "" });
    setMoveLibraryOpen(false);
  };

  const value: DialogContextType = {
    // Document detail dialog
    selectedDocument,
    setSelectedDocument,
    documentDialogOpen,
    setDocumentDialogOpen,

    // Library dialogs
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,

    renameLibraryOpen,
    setRenameLibraryOpen,
    selectedLibraryForOperation,
    setSelectedLibraryForOperation,
    renameLibraryName,
    setRenameLibraryName,

    moveLibraryOpen,
    setMoveLibraryOpen,
    moveLibraryPath,
    setMoveLibraryPath,

    archiveLibraryOpen,
    setArchiveLibraryOpen,

    // Import dialog
    importDialogOpen,
    setImportDialogOpen,

    // Bulk delete
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,

    // Reset functions
    resetCreateDialog,
    resetRenameDialog,
    resetMoveDialog,
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
