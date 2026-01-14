"use client";

import { useState, useCallback, useEffect } from "react";
import { DocumentDetailDialog } from "@/components/library/dialogs/detail-dialog";
import { Sidebar } from "@/components/library/layout";
import { Controls } from "@/components/library/layout";
import { Content } from "@/components/library/core";
import {
  LibraryDialog,
  ArchiveDialog,
  ImportDialog,
} from "@/components/library/dialogs";
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
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDocumentHandlers } from "@/hooks/use-document-handlers";
import { useBulkOperations } from "@/hooks/use-bulk-operations";
import { LibraryDocument } from "@/lib/library";
import { ViewMode } from "@/lib/types/common";
import { combineSearchParams } from "@/lib/utils/url-params";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Custom hooks
  const {
    currentLibrary,
    setCurrentLibrary,
    libraries,
    documents,
    categories,
    loading,
    pagination,
    loadPage,
    loadFilteredData,
    refreshLibraries,
    refreshLibraryData,
    filterOptions,
  } = useLibraryData();

  const {
    selectedCategory,
    setSelectedCategory,
    selectedKeywords,
    setSelectedKeywords,
    selectedFormats,
    setSelectedFormats,
    selectedAuthors,
    setSelectedAuthors,
    selectedPublishers,
    setSelectedPublishers,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filterParams,
    isSearching,
  } = useDocumentFilters();

  const { sortBy, setSortBy, sortParams } = useDocumentSorting();

  const {
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    renameLibraryOpen,
    setRenameLibraryOpen,
    moveLibraryOpen,
    setMoveLibraryOpen,
    archiveLibraryOpen,
    setArchiveLibraryOpen,
    renameLibraryName,
    setRenameLibraryName,
    moveLibraryPath,
    setMoveLibraryPath,
    selectedLibraryForOperation,
    handleCreateLibrary,
    handleRenameLibrary,
    handleMoveLibrary,
    handleArchiveLibrary,
    handleOpenRenameDialog,
    handleOpenMoveDialog,
    handleOpenArchiveDialog,
    resetCreateDialog,
    resetRenameDialog,
    resetMoveDialog,
  } = useLibraryOperations({
    currentLibrary,
    setCurrentLibrary,
    libraries,
    onLibrariesChange: refreshLibraries,
  });

  const { handleOpen, handleDocumentDelete, handleDocumentUpdate: baseHandleDocumentUpdate, handleFavoriteToggle } = useDocumentHandlers({
    currentLibrary,
    filterParams,
    sortParams,
    loadFilteredData,
  });

  const handleDocumentUpdate = useCallback(async (updatedDoc: LibraryDocument) => {
    const resultDoc = await baseHandleDocumentUpdate(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
  }, [baseHandleDocumentUpdate]);

  const {
    selectionMode,
    selectedDocuments,
    bulkDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    handleToggleSelectionMode,
    handleToggleDocumentSelection,
    handleSelectAllDocuments,
    handleClearSelection,
    handleBulkDelete,
    handleBulkMove,
  } = useBulkOperations({
    documents,
    currentLibrary,
    filterParams,
    sortParams,
    loadFilteredData,
  });

  const handleDocumentClick = useCallback(
    (document: LibraryDocument) => {
      if (selectionMode) {
        handleToggleDocumentSelection(document.id);
      } else {
        setSelectedDocument(document);
        setDialogOpen(true);
      }
    },
    [selectionMode, handleToggleDocumentSelection]
  );

  const handleBreadcrumbClick = useCallback(
    (category: string) => {
      setSelectedCategory(category);
    },
    [setSelectedCategory]
  );

  useEffect(() => {
    if (currentLibrary) {
      const combinedParams = combineSearchParams(filterParams, sortParams);
      loadFilteredData(combinedParams);
    }
  }, [filterParams, sortParams, currentLibrary, loadFilteredData]);

  useEffect(() => {
    setTimeout(() => {
      handleClearSelection();
    }, 0);
  }, [currentLibrary, selectedCategory, handleClearSelection]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              ManiBook
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Organize and browse your collection of books with powerful search
              and filtering
            </p>
          </div>
        </div>

        <div className="flex gap-10 lg:gap-12">
          <Sidebar
            libraries={libraries}
            currentLibrary={currentLibrary}
            categories={categories}
            selectedCategory={selectedCategory}
            selectedKeywords={selectedKeywords}
            selectedFormats={selectedFormats}
            selectedAuthors={selectedAuthors}
            selectedPublishers={selectedPublishers}
            showFavoritesOnly={showFavoritesOnly}
            filterOptions={filterOptions}
            onLibrarySelect={setCurrentLibrary}
            onCategorySelect={setSelectedCategory}
            onCreateLibrary={() => setCreateLibraryOpen(true)}
            onRenameLibrary={handleOpenRenameDialog}
            onMoveLibrary={handleOpenMoveDialog}
            onArchiveLibrary={handleOpenArchiveDialog}
            onKeywordsChange={setSelectedKeywords}
            onFormatsChange={setSelectedFormats}
            onAuthorsChange={setSelectedAuthors}
            onPublishersChange={setSelectedPublishers}
            onShowFavoritesOnlyChange={setShowFavoritesOnly}
          />

          <div className="flex-1 min-w-0">
            <Controls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              librariesLength={libraries.length}
              onOpenImportDialog={() => setImportDialogOpen(true)}
              isSearching={isSearching}
              selectionMode={selectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedCount={selectedDocuments.size}
              onSelectAll={handleSelectAllDocuments}
              onClearSelection={handleClearSelection}
              onBulkDelete={() => setBulkDeleteDialogOpen(true)}
              onBulkMove={handleBulkMove}
            />

            <Content
              currentLibrary={currentLibrary}
              selectedCategory={selectedCategory}
              documents={documents}
              viewMode={viewMode}
              loading={loading}
              pagination={pagination}
              onDocumentClick={handleDocumentClick}
              onOpen={handleOpen}
              onFavoriteToggle={handleFavoriteToggle}
              onDelete={handleDocumentDelete}
              onBreadcrumbClick={handleBreadcrumbClick}
              onPageChange={loadPage}
              selectionMode={selectionMode}
              selectedDocuments={selectedDocuments}
              onToggleDocumentSelection={handleToggleDocumentSelection}
            />
          </div>
        </div>

        <DocumentDetailDialog
          library={currentLibrary}
          document={selectedDocument}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
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
          currentPath={selectedLibraryForOperation.path}
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
      </div>
    </div>
  );
}
