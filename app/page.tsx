"use client";

import { useState, useEffect } from "react";
import { LibraryProvider, useLibraryContext } from "@/contexts/LibraryContext";
import { DialogProvider, useDialogContext } from "@/contexts/DialogContext";
import { DocumentActionsProvider } from "@/contexts/DocumentActionsContext";
import { Sidebar } from "@/components/library/layout/sidebar";
import { Controls } from "@/components/library/layout/controls";
import { Content } from "@/components/library/core/content";
import { DialogManager } from "@/components/library/dialogs/dialog-manager";
import { useHomeHandlers } from "@/hooks/use-home-handlers";
import { ViewMode } from "@/lib/types/common";

function HomeContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const {
    currentLibrary,
    selectedCategory,
    selectionMode,
    setSelectedCategory,
    handleClearSelection,
    combinedParams,
    loadFilteredData,
    handleOpen,
    handleDocumentDelete,
    handleToggleDocumentSelection,
    handleFavoriteToggle,
  } = useLibraryContext();

  const { setSelectedDocument, setDocumentDialogOpen } = useDialogContext();

  const {
    handleDocumentClick,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
  } = useHomeHandlers(
    setSelectedDocument,
    setDocumentDialogOpen,
    selectionMode,
    handleToggleDocumentSelection,
    setSelectedCategory
  );

  const documentActionsValue = {
    handleOpen,
    handleFavoriteToggle,
    handleDocumentDelete,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
    handleToggleDocumentSelection,
    onDocumentClick: handleDocumentClick,
  };

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
    <DocumentActionsProvider value={documentActionsValue}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8 space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                ManiBook
              </h1>
              <p className="text-muted-foreground text-lg max-w-md">
                Organize and browse your collection of books with powerful
                search and filtering
              </p>
            </div>
          </div>

          {/* Main */}
          <div className="flex gap-10 lg:gap-12">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <Controls viewMode={viewMode} onViewModeChange={setViewMode} />
              <Content viewMode={viewMode} />
            </div>
          </div>

          {/* Dialogs */}
          <DialogManager />
        </div>
      </div>
    </DocumentActionsProvider>
  );
}

export default function Home() {
  return (
    <DialogProvider>
      <LibraryProvider>
        <HomeContent />
      </LibraryProvider>
    </DialogProvider>
  );
}
