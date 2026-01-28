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
import { useDialogContext } from "@/contexts/DialogContext";
import { useLibraryContext } from "@/contexts/LibraryContext";
import { useDocumentActionsContext } from "@/contexts/DocumentActionsContext";

export function DialogManager() {
  const {
    selectedDocument,
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
  } = useDialogContext();

  const {
    currentLibrary,
    handleCreateLibrary,
    refreshLibraryData,
    selectedDocuments,
    handleBulkDelete,
  } = useLibraryContext();

  const { handleOpen, handleDocumentDelete, handleDocumentUpdate } =
    useDocumentActionsContext();

  return (
    <>
      <DocumentDetailDialog
        library={currentLibrary}
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
        currentLibrary={currentLibrary}
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
