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
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDebouncedFilters } from "@/hooks/use-debounced-filters";
import { LibraryDocument } from "@/lib/library";

type ViewMode = "card" | "list";

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

  // Event handlers
  const handleOpen = useCallback(
    (doc: LibraryDocument) => {
      const fileUrl = doc.url.startsWith("lib://")
        ? `/api/libraries/${currentLibrary}/files/${doc.url.substring(6)}`
        : doc.url;
      window.open(fileUrl, "_blank");
    },
    [currentLibrary]
  );

  const handleDocumentClick = useCallback((document: LibraryDocument) => {
    setSelectedDocument(document);
    setDialogOpen(true);
  }, []);

  const handleDocumentDelete = useCallback(
    async (document: LibraryDocument) => {
      try {
        await fetch(
          `/api/libraries/${currentLibrary}/documents/${document.id}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error("Error deleting document:", error);
      }
      refreshLibraryData();
    },
    [currentLibrary, refreshLibraryData]
  );

  const handleDocumentUpdate = useCallback(
    async (updatedDoc: LibraryDocument) => {
      try {
        const response = await fetch(
          `/api/libraries/${currentLibrary}/documents/${updatedDoc.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              metadata: updatedDoc.metadata,
            }),
          }
        );
        if (response.ok) {
          const result = await response.json();
          setSelectedDocument(result.document);
          refreshLibraryData();
        } else {
          console.error("Error updating document");
        }
      } catch (error) {
        console.error("Error updating document:", error);
      }
    },
    [currentLibrary, refreshLibraryData]
  );

  const handleFavoriteToggle = useCallback(
    async (document: LibraryDocument) => {
      try {
        await fetch(
          `/api/libraries/${currentLibrary}/documents/${document.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ favorite: !document.metadata.favorite }),
          }
        );
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
      refreshLibraryData();
    },
    [currentLibrary, refreshLibraryData]
  );

  const handleBreadcrumbClick = useCallback(
    (category: string) => {
      setSelectedCategory(category);
    },
    [setSelectedCategory]
  );

  const debouncedFilterParams = useDebouncedFilters(filterParams, 300);

  useEffect(() => {
    if (currentLibrary) {
      const combinedParams = new URLSearchParams();
      debouncedFilterParams.forEach((value: string, key: string) => {
        combinedParams.set(key, value);
      });
      sortParams.forEach((value: string, key: string) => {
        combinedParams.set(key, value);
      });

      loadFilteredData(combinedParams);
    }
  }, [debouncedFilterParams, sortParams, currentLibrary, loadFilteredData]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Library
            </h1>
            <p className="text-muted-foreground text-lg max-w-md">
              Organize and browse your collection of books and articles with
              powerful search and filtering
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
              onBreadcrumbClick={handleBreadcrumbClick}
              onPageChange={loadPage}
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
      </div>
    </div>
  );
}
