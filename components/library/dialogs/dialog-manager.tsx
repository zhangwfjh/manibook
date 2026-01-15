import { DocumentDetailDialog } from "@/components/library/dialogs/detail-dialog";
import { LibraryDialog } from "@/components/library/dialogs/library-dialog";
import { ArchiveDialog } from "@/components/library/dialogs/archive-dialog";
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
    renameLibraryOpen,
    setRenameLibraryOpen,
    selectedLibraryForOperation,
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
  } = useDialogContext();

  const {
    currentLibrary,
    handleCreateLibrary,
    handleRenameLibrary,
    handleMoveLibrary,
    handleArchiveLibrary,
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

      <LibraryDialog
        mode="create"
        open={createLibraryOpen}
        onOpenChange={setCreateLibraryOpen}
        name={newLibraryName}
        onNameChange={setNewLibraryName}
        path={newLibraryPath}
        onPathChange={setNewLibraryPath}
        onSubmit={handleCreateLibrary}
        onCancel={resetCreateDialog}
      />

      <LibraryDialog
        mode="rename"
        open={renameLibraryOpen}
        onOpenChange={setRenameLibraryOpen}
        currentName={selectedLibraryForOperation.name}
        name={renameLibraryName}
        onNameChange={setRenameLibraryName}
        onSubmit={handleRenameLibrary}
        onCancel={resetRenameDialog}
      />

      <LibraryDialog
        mode="move"
        open={moveLibraryOpen}
        onOpenChange={setMoveLibraryOpen}
        currentPath={selectedLibraryForOperation.path || ""}
        path={moveLibraryPath}
        onPathChange={setMoveLibraryPath}
        onSubmit={handleMoveLibrary}
        onCancel={resetMoveDialog}
      />

      <ArchiveDialog
        open={archiveLibraryOpen}
        onOpenChange={setArchiveLibraryOpen}
        currentLibrary={currentLibrary}
        handleArchiveLibrary={handleArchiveLibrary}
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
