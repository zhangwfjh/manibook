"use client";

import { DocumentDetailDialog } from "@/components/library/dialogs/detail-dialog";
import { CreateLibraryDialog } from "@/components/library/dialogs/create-library-dialog";
import { ImportDialog } from "@/components/library/dialogs/import-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLibraryContext } from "@/contexts/LibraryContext";
import { useImportContext } from "@/contexts/ImportContext";

export function DialogManager() {
  const {
    selectedDocument,
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    documentDialogOpen,
    setDocumentDialogOpen,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    resetCreateDialog,
    handleCreateLibrary,
    refreshLibraryData,
    selectedDocuments,
    handleBulkDelete,
    handleOpen,
    handleDocumentDelete,
    handleDocumentUpdate,
  } = useLibraryContext();

  const { importDialogOpen, setImportDialogOpen } = useImportContext();

  return (
    <>
      <DocumentDetailDialog
        document={selectedDocument}
        open={documentDialogOpen}
        onOpenChange={setDocumentDialogOpen}
        onOpen={handleOpen}
        onDelete={handleDocumentDelete}
        onUpdate={handleDocumentUpdate}
      />

      <CreateLibraryDialog
        open={createLibraryOpen}
        onOpenChange={setCreateLibraryOpen}
        name={newLibraryName}
        onNameChange={setNewLibraryName}
        path={newLibraryPath}
        onPathChange={setNewLibraryPath}
        onSubmit={handleCreateLibrary}
        onCancel={resetCreateDialog}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={refreshLibraryData}
      />

      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedDocuments.size} Document(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDocuments.size}{" "}
              document(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
