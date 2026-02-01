"use client";

import { useState, useEffect, useEffectEvent } from "react";
import { Sidebar } from "@/components/library/navigation/sidebar";
import { Controls } from "@/components/library/views/controls";
import { Content } from "@/components/library/views/content";
import { DialogManager } from "@/components/library/dialogs/dialog-manager";
import { ViewMode } from "@/components/library/types";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryOperations,
  useLibraryUIStore,
} from "@/stores";
import { useLibraryInit, useDebouncedSearch } from "@/hooks/library";

function HomeContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  useLibraryInit();
  useDebouncedSearch();

  const { libraryName } = useLibraryDataStore();
  const { selectedCategory } = useLibraryFilterStore();
  const { loadFilteredData } = useLibraryOperations();
  const { clearSelection } = useLibraryUIStore();

  const onLoadData = useEffectEvent(() => {
    if (libraryName) {
      loadFilteredData();
    }
  });

  useEffect(() => {
    onLoadData();
  }, [libraryName]);

  const onClearSelection = useEffectEvent(() => {
    clearSelection();
  });

  useEffect(() => {
    setTimeout(() => {
      onClearSelection();
    }, 0);
  }, [libraryName, selectedCategory]);

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
  return <HomeContent />;
}
