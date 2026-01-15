import React, { createContext, useContext, ReactNode } from "react";
import { LibraryDocument } from "@/lib/library";

interface DialogContextType {
  selectedDocument: LibraryDocument | null;
  setSelectedDocument: (document: LibraryDocument | null) => void;
  documentDialogOpen: boolean;
  setDocumentDialogOpen: (open: boolean) => void;

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

  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;

  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;

  resetCreateDialog: () => void;
  resetRenameDialog: () => void;
  resetMoveDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProviderProps {
  children: ReactNode;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [selectedDocument, setSelectedDocument] =
    React.useState<LibraryDocument | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = React.useState(false);

  const [createLibraryOpen, setCreateLibraryOpen] = React.useState(false);
  const [newLibraryName, setNewLibraryName] = React.useState("");
  const [newLibraryPath, setNewLibraryPath] = React.useState("");

  const [renameLibraryOpen, setRenameLibraryOpen] = React.useState(false);
  const [selectedLibraryForOperation, setSelectedLibraryForOperation] =
    React.useState<{ name: string; path?: string }>({ name: "" });
  const [renameLibraryName, setRenameLibraryName] = React.useState("");

  const [moveLibraryOpen, setMoveLibraryOpen] = React.useState(false);
  const [moveLibraryPath, setMoveLibraryPath] = React.useState("");

  const [archiveLibraryOpen, setArchiveLibraryOpen] = React.useState(false);

  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);

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

    importDialogOpen,
    setImportDialogOpen,

    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,

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
