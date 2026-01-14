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
import { LibraryDocument } from "@/lib/library";

interface HomeDialogsProps {
  // Document detail
  selectedDocument: LibraryDocument | null;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  onOpen: (doc: LibraryDocument) => void;
  onDelete: (document: LibraryDocument) => Promise<void>;
  handleDocumentUpdate: (updatedDoc: LibraryDocument) => Promise<void>;

  // Library dialogs
  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  handleCreateLibrary: () => Promise<void>;
  resetCreateDialog: () => void;

  renameLibraryOpen: boolean;
  setRenameLibraryOpen: (open: boolean) => void;
  currentName: string;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;
  handleRenameLibrary: () => Promise<void>;
  resetRenameDialog: () => void;

  moveLibraryOpen: boolean;
  setMoveLibraryOpen: (open: boolean) => void;
  currentPath: string;
  moveLibraryPath: string;
  setMoveLibraryPath: (path: string) => void;
  handleMoveLibrary: () => Promise<void>;
  resetMoveDialog: () => void;

  archiveLibraryOpen: boolean;
  setArchiveLibraryOpen: (open: boolean) => void;
  currentLibrary: string;
  handleArchiveLibrary: () => Promise<void>;

  // Import dialog
  importDialogOpen: boolean;
  setImportDialogOpen: (open: boolean) => void;
  onImportComplete: () => Promise<void>;

  // Bulk delete
  bulkDeleteDialogOpen: boolean;
  setBulkDeleteDialogOpen: (open: boolean) => void;
  selectedDocuments: Set<string>;
  handleBulkDelete: () => Promise<void>;
}

export function HomeDialogs({
  selectedDocument,
  dialogOpen,
  setDialogOpen,
  onOpen,
  onDelete,
  handleDocumentUpdate,
  createLibraryOpen,
  setCreateLibraryOpen,
  newLibraryName,
  setNewLibraryName,
  newLibraryPath,
  setNewLibraryPath,
  handleCreateLibrary,
  resetCreateDialog,
  renameLibraryOpen,
  setRenameLibraryOpen,
  currentName,
  renameLibraryName,
  setRenameLibraryName,
  handleRenameLibrary,
  resetRenameDialog,
  moveLibraryOpen,
  setMoveLibraryOpen,
  currentPath,
  moveLibraryPath,
  setMoveLibraryPath,
  handleMoveLibrary,
  resetMoveDialog,
  archiveLibraryOpen,
  setArchiveLibraryOpen,
  currentLibrary,
  handleArchiveLibrary,
  importDialogOpen,
  setImportDialogOpen,
  onImportComplete,
  bulkDeleteDialogOpen,
  setBulkDeleteDialogOpen,
  selectedDocuments,
  handleBulkDelete,
}: HomeDialogsProps) {
  return (
    <>
      <DocumentDetailDialog
        library={currentLibrary}
        document={selectedDocument}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onOpen={onOpen}
        onDelete={onDelete}
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
        currentName={currentName}
        name={renameLibraryName}
        onNameChange={setRenameLibraryName}
        onSubmit={handleRenameLibrary}
        onCancel={resetRenameDialog}
      />

      <LibraryDialog
        mode="move"
        open={moveLibraryOpen}
        onOpenChange={setMoveLibraryOpen}
        currentPath={currentPath}
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
        onImportComplete={onImportComplete}
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