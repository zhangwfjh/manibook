"use client";

import { useState, useEffect } from "react";
import { LibraryProvider, useLibraryContext } from "@/contexts/LibraryContext";
import { HomeHeader } from "@/components/HomeHeader";
import { HomeMain } from "@/components/HomeMain";
import { HomeDialogs } from "@/components/HomeDialogs";
import { useHomeHandlers } from "@/hooks/use-home-handlers";
import { LibraryDocument } from "@/lib/library";
import { ViewMode } from "@/lib/types/common";

function HomeContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const {
    currentLibrary,
    selectedCategory,
    selectionMode,
    selectedDocuments,
    setSelectedCategory,
    handleClearSelection,
    combinedParams,
    loadFilteredData,
    // Dialog props
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
    selectedLibraryForOperation,
    renameLibraryName,
    setRenameLibraryName,
    handleRenameLibrary,
    resetRenameDialog,
    moveLibraryOpen,
    setMoveLibraryOpen,
    moveLibraryPath,
    setMoveLibraryPath,
    handleMoveLibrary,
    resetMoveDialog,
    archiveLibraryOpen,
    setArchiveLibraryOpen,
    handleArchiveLibrary,
    refreshLibraryData,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    handleBulkDelete,
    handleOpen,
    handleDocumentDelete,
    handleToggleDocumentSelection,
  } = useLibraryContext();

  const {
    handleDocumentClick,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
  } = useHomeHandlers(
    setSelectedDocument,
    setDialogOpen,
    selectionMode,
    handleToggleDocumentSelection,
    setSelectedCategory
  );

  useEffect(() => {
    if (currentLibrary) {
      loadFilteredData(combinedParams);
    }
  }, [combinedParams, currentLibrary, loadFilteredData]);

  useEffect(() => {
    setTimeout(() => {
      handleClearSelection();
    }, 0);
  }, [currentLibrary, selectedCategory, handleClearSelection]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-6 py-8">
        <HomeHeader />

        <HomeMain
          viewMode={viewMode}
          setViewMode={setViewMode}
          setImportDialogOpen={setImportDialogOpen}
          handleDocumentClick={handleDocumentClick}
        />

        <HomeDialogs
          selectedDocument={selectedDocument}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          onOpen={handleOpen}
          onDelete={handleDocumentDelete}
          handleDocumentUpdate={handleDocumentUpdateWrapper}
          createLibraryOpen={createLibraryOpen}
          setCreateLibraryOpen={setCreateLibraryOpen}
          newLibraryName={newLibraryName}
          setNewLibraryName={setNewLibraryName}
          newLibraryPath={newLibraryPath}
          setNewLibraryPath={setNewLibraryPath}
          handleCreateLibrary={handleCreateLibrary}
          resetCreateDialog={resetCreateDialog}
          renameLibraryOpen={renameLibraryOpen}
          setRenameLibraryOpen={setRenameLibraryOpen}
          currentName={selectedLibraryForOperation.name}
          renameLibraryName={renameLibraryName}
          setRenameLibraryName={setRenameLibraryName}
          handleRenameLibrary={handleRenameLibrary}
          resetRenameDialog={resetRenameDialog}
          moveLibraryOpen={moveLibraryOpen}
          setMoveLibraryOpen={setMoveLibraryOpen}
          currentPath={selectedLibraryForOperation.path || ""}
          moveLibraryPath={moveLibraryPath}
          setMoveLibraryPath={setMoveLibraryPath}
          handleMoveLibrary={handleMoveLibrary}
          resetMoveDialog={resetMoveDialog}
          archiveLibraryOpen={archiveLibraryOpen}
          setArchiveLibraryOpen={setArchiveLibraryOpen}
          currentLibrary={currentLibrary}
          handleArchiveLibrary={handleArchiveLibrary}
          importDialogOpen={importDialogOpen}
          setImportDialogOpen={setImportDialogOpen}
          onImportComplete={refreshLibraryData}
          bulkDeleteDialogOpen={bulkDeleteDialogOpen}
          setBulkDeleteDialogOpen={setBulkDeleteDialogOpen}
          selectedDocuments={selectedDocuments}
          handleBulkDelete={handleBulkDelete}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <LibraryProvider>
      <HomeContent />
    </LibraryProvider>
  );
}
