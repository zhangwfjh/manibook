"use client";

import { useState, useEffect, useEffectEvent } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarInset,
} from "@/components/ui/sidebar";
import { LibrarySidebar } from "@/components/library/navigation/sidebar";
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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/10 flex">
        <Sidebar collapsible="offcanvas" variant="sidebar" className="border-r">
          <LibrarySidebar />
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="flex-1">
          <div className="container mx-auto px-6 py-8">
            <Controls viewMode={viewMode} onViewModeChange={setViewMode} />
            <Content viewMode={viewMode} />
            <DialogManager />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function Home() {
  return <HomeContent />;
}
