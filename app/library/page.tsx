"use client";

import React, { useState, useCallback } from "react";
import { DocumentDetailDialog } from "@/components/library/document-detail-dialog";
import { LibraryHeader } from "@/components/library/library-header";
import { LibrarySidebar } from "@/components/library/library-sidebar";
import { LibraryControls } from "@/components/library/library-controls";
import { LibraryContent } from "@/components/library/library-content";
import { LibraryDialogs } from "@/components/library/library-dialogs";
import { useLibraryData } from "@/hooks/use-library-data";
import { useDocumentFilters } from "@/hooks/use-document-filters";
import { useDocumentSorting } from "@/hooks/use-document-sorting";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useLibraryOperations } from "@/hooks/use-library-operations";
import { LibraryDocument } from "@/lib/library";

type ViewMode = "card" | "list";

export default function LibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [selectedDocument, setSelectedDocument] =
    useState<LibraryDocument | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Custom hooks
  const {
    currentLibrary,
    setCurrentLibrary,
    libraries,
    documents,
    categories,
    loading,
    refreshLibraries,
    refreshLibraryData,
  } = useLibraryData();

  const {
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    selectedFormats,
    setSelectedFormats,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    filteredDocuments,
    resetFilters,
  } = useDocumentFilters(documents);

  const {
    sortBy,
    setSortBy,
    sortedDocuments,
  } = useDocumentSorting(filteredDocuments);

  const {
    uploading,
    uploadProgress,
    uploadProgressPercent,
    fileInputRef,
    folderInputRef,
    handleFileUpload,
    triggerFileUpload,
    triggerFolderUpload,
  } = useFileUpload({
    currentLibrary,
    onUploadComplete: refreshLibraryData,
  });

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
  const handleDownload = useCallback((doc: LibraryDocument) => {
    const link = window.document.createElement("a");
    link.href = doc.url.startsWith("lib://")
      ? `/api/libraries/${currentLibrary}/files/${doc.url.substring(6)}`
      : doc.url;
    link.download = doc.filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }, [currentLibrary]);

  const handleDocumentClick = useCallback((document: LibraryDocument) => {
    setSelectedDocument(document);
    setDialogOpen(true);
  }, []);

  const handleDocumentDelete = useCallback(async (document: LibraryDocument) => {
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
  }, [currentLibrary, refreshLibraryData]);

  const handleDocumentUpdate = useCallback(async (updatedDoc: LibraryDocument) => {
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
  }, [currentLibrary, refreshLibraryData]);

  const handleFavoriteToggle = useCallback(async (document: LibraryDocument) => {
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
  }, [currentLibrary, refreshLibraryData]);

  const handleBreadcrumbClick = useCallback((category: string) => {
    setSelectedCategory(category);
  }, [setSelectedCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 py-8">
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

        <div className="flex gap-8">
          {/* Sidebar */}
          <LibrarySidebar
            libraries={libraries}
            currentLibrary={currentLibrary}
            categories={categories}
            selectedCategory={selectedCategory}
            documents={documents}
            selectedTags={selectedTags}
            selectedFormats={selectedFormats}
            showFavoritesOnly={showFavoritesOnly}
            onLibrarySelect={setCurrentLibrary}
            onCategorySelect={setSelectedCategory}
            onCreateLibrary={() => setCreateLibraryOpen(true)}
            onRenameLibrary={handleOpenRenameDialog}
            onArchiveLibrary={handleOpenArchiveDialog}
            onTagsChange={setSelectedTags}
            onFormatsChange={setSelectedFormats}
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
              uploading={uploading}
              uploadProgress={uploadProgress}
              uploadProgressPercent={uploadProgressPercent}
              onUploadFiles={triggerFileUpload}
              onUploadFolder={triggerFolderUpload}
              fileInputRef={fileInputRef}
              folderInputRef={folderInputRef}
              onFileUpload={handleFileUpload}
            />

            {/* Content */}
            <LibraryContent
              currentLibrary={currentLibrary}
              selectedCategory={selectedCategory}
              sortedDocuments={sortedDocuments}
              viewMode={viewMode}
              onDocumentClick={handleDocumentClick}
              onDownload={handleDownload}
              onFavoriteToggle={handleFavoriteToggle}
              onBreadcrumbClick={handleBreadcrumbClick}
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
        />
      </div>
    </div>
  );
}
