"use client";

import { DocumentDetailDialog } from "@/components/library/dialogs/detail-dialog";
import { CreateLibraryDialog } from "@/components/library/dialogs/create-library-dialog";
import { ImportDialog } from "@/components/library/dialogs/import-dialog";
import { SettingsDialog } from "@/components/library/dialogs/settings-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useLibraryUIStore, useLibraryOperations } from "@/stores";
import { useImportStore } from "@/stores/importStore";

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
    selectedDocuments,
    handleDocumentUpdate,
    settingsOpen,
    setSettingsOpen,
  } = useLibraryUIStore();
  const {
    createLibrary,
    refreshData,
    bulkDelete,
    openDocument,
    deleteDocument,
  } = useLibraryOperations();

  const { importDialogOpen, setImportDialogOpen } = useImportStore();

  return (
    <>
      <DocumentDetailDialog
        document={selectedDocument}
        open={documentDialogOpen}
        onOpenChange={setDocumentDialogOpen}
        onOpen={openDocument}
        onDelete={deleteDocument}
        onUpdate={handleDocumentUpdate}
      />

      <CreateLibraryDialog
        open={createLibraryOpen}
        onOpenChange={setCreateLibraryOpen}
        name={newLibraryName}
        onNameChange={setNewLibraryName}
        path={newLibraryPath}
        onPathChange={setNewLibraryPath}
        onSubmit={createLibrary}
        onCancel={resetCreateDialog}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={refreshData}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={`Delete ${selectedDocuments.size} Document(s)`}
        description={`Are you sure you want to delete ${selectedDocuments.size} document(s)? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => bulkDelete(Array.from(selectedDocuments))}
      />
    </>
  );
}
