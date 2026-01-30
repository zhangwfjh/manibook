"use client";

import { useState, useEffect } from "react";
import { LibraryProvider, useLibraryContext } from "@/contexts/LibraryContext";
import { ImportProvider } from "@/contexts/ImportContext";
import { Sidebar } from "@/components/library/layout/sidebar";
import { Controls } from "@/components/library/layout/controls";
import { Content } from "@/components/library/core/content";
import { DialogManager } from "@/components/library/dialogs/dialog-manager";
import { ViewMode } from "@/components/library/types";

function HomeContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const {
    libraryName,
    selectedCategory,
    handleClearSelection,
    filterParams,
    sortParams,
    loadFilteredData,
  } = useLibraryContext();

  useEffect(() => {
    if (libraryName) {
      loadFilteredData(filterParams, sortParams);
    }
  }, [filterParams, sortParams, libraryName, loadFilteredData]);

  useEffect(() => {
    setTimeout(() => {
      handleClearSelection();
    }, 0);
  }, [libraryName, selectedCategory, handleClearSelection]);

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
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
  );
}

export default function Home() {
  return (
    <ImportProvider>
      <LibraryProvider>
        <HomeContent />
      </LibraryProvider>
    </ImportProvider>
  );
}
