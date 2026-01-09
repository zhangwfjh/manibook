"use client";

import { useState, useCallback, useEffect } from "react";
import { DocumentDetailDialog } from "@/components/library/document-detail-dialog";
import { LibraryHeader } from "@/components/library/library-header";
import { LibrarySidebar } from "@/components/library/library-sidebar";
import { LibraryControls } from "@/components/library/library-controls";
import { LibraryContent } from "@/components/library/library-content";
import { LibraryDialogs } from "@/components/library/library-dialogs";
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { useDebouncedFilters } from "@/hooks/use-debounced-filters";
import { LibraryDocument } from "@/lib/library";

type ViewMode = "card" | "list";

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
    archiveLibraryOpen,
    setArchiveLibraryOpen,
    renameLibraryName,
    setRenameLibraryName,
    handleCreateLibrary,
    handleRenameLibrary,
    handleArchiveLibrary,
    handleOpenRenameDialog,
    handleOpenArchiveDialog,
    resetCreateDialog,
    resetRenameDialog,
  } = useLibraryOperations({
    currentLibrary,
    setCurrentLibrary,
    libraries,
    onLibrariesChange: refreshLibraries,
  });

  // Event handlers
  const handleDownload = useCallback(
    (doc: LibraryDocument) => {
      const link = window.document.createElement("a");
      link.href = doc.url.startsWith("lib://")
        ? `/api/libraries/${currentLibrary}/files/${doc.url.substring(6)}`
        : doc.url;
      link.download = doc.filename;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
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
          `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
            document.filename
          )}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error("Error deleting document:", error);
      }
      // Refresh the library data after deletion
      refreshLibraryData();
    },
    [currentLibrary, refreshLibraryData]
  );

  const handleDocumentUpdate = useCallback(
    async (updatedDoc: LibraryDocument) => {
      try {
        const response = await fetch(
          `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
            updatedDoc.filename
          )}`,
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
          // Also refresh the library data
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
          `/api/libraries/${currentLibrary}/documents/${encodeURIComponent(
            document.filename
          )}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ favorite: !document.metadata.favorite }),
          }
        );
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
      // Refresh the library data after favorite toggle
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

  // Reload data when filters change (with debouncing)
  const debouncedFilterParams = useDebouncedFilters(filterParams, 300);

  useEffect(() => {
    if (currentLibrary) {
      // Combine filter and sort parameters
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
        {/* Header */}
        <LibraryHeader
          createLibraryOpen={createLibraryOpen}
          setCreateLibraryOpen={setCreateLibraryOpen}
          newLibraryName={newLibraryName}
          setNewLibraryName={setNewLibraryName}
          newLibraryPath={newLibraryPath}
          setNewLibraryPath={setNewLibraryPath}
          handleCreateLibrary={handleCreateLibrary}
          resetCreateDialog={resetCreateDialog}
        />

        <div className="flex gap-10 lg:gap-12">
          {/* Sidebar */}
          <LibrarySidebar
            libraries={libraries}
            currentLibrary={currentLibrary}
            categories={categories}
            selectedCategory={selectedCategory}
            documents={documents}
            selectedKeywords={selectedKeywords}
            selectedFormats={selectedFormats}
            selectedAuthors={selectedAuthors}
            selectedPublishers={selectedPublishers}
            showFavoritesOnly={showFavoritesOnly}
            onLibrarySelect={setCurrentLibrary}
            onCategorySelect={setSelectedCategory}
            onCreateLibrary={() => setCreateLibraryOpen(true)}
            onRenameLibrary={handleOpenRenameDialog}
            onArchiveLibrary={handleOpenArchiveDialog}
            onKeywordsChange={setSelectedKeywords}
            onFormatsChange={setSelectedFormats}
            onAuthorsChange={setSelectedAuthors}
            onPublishersChange={setSelectedPublishers}
            onShowFavoritesOnlyChange={setShowFavoritesOnly}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Controls */}
            <LibraryControls
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              librariesLength={libraries.length}
              onOpenUploadDialog={() => setUploadDialogOpen(true)}
              isSearching={isSearching}
            />

            {/* Content */}
            <LibraryContent
              currentLibrary={currentLibrary}
              selectedCategory={selectedCategory}
              documents={documents}
              viewMode={viewMode}
              loading={loading}
              pagination={pagination}
              onDocumentClick={handleDocumentClick}
              onDownload={handleDownload}
              onFavoriteToggle={handleFavoriteToggle}
              onBreadcrumbClick={handleBreadcrumbClick}
              onPageChange={loadPage}
            />
          </div>
        </div>

        {/* Document Detail Dialog */}
        <DocumentDetailDialog
          library={currentLibrary}
          document={selectedDocument}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onDownload={handleDownload}
          onDelete={handleDocumentDelete}
          onUpdate={handleDocumentUpdate}
        />

        {/* Library Dialogs */}
        <LibraryDialogs
          renameLibraryOpen={renameLibraryOpen}
          setRenameLibraryOpen={setRenameLibraryOpen}
          renameLibraryName={renameLibraryName}
          setRenameLibraryName={setRenameLibraryName}
          handleRenameLibrary={handleRenameLibrary}
          resetRenameDialog={resetRenameDialog}
          archiveLibraryOpen={archiveLibraryOpen}
          setArchiveLibraryOpen={setArchiveLibraryOpen}
          currentLibrary={currentLibrary}
          handleArchiveLibrary={handleArchiveLibrary}
          uploadDialogOpen={uploadDialogOpen}
          setUploadDialogOpen={setUploadDialogOpen}
          onUploadComplete={refreshLibraryData}
        />
      </div>
    </div>
  );
}
