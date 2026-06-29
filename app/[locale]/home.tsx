"use client";

import { useEffect, useEffectEvent } from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarRail,
  SidebarInset,
} from "@/components/ui/sidebar";
import { LibrarySidebar, TitleBar } from "@/components/library/navigation";
import { Controls } from "@/components/library/views/controls";
import { Content } from "@/components/library/views/content";
import { DialogManager } from "@/components/library/dialogs/dialog-manager";
import { CommandPalette } from "@/components/command-palette";
import { FloatingScrollButtons } from "@/components/floating-scroll-buttons";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryOperations,
  useLibraryUIStore,
} from "@/stores";
import { useLibraryInit, useDebouncedSearch } from "@/hooks/library";

export function HomeContent() {
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
    <div className="relative z-10 flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-0 flex-1 reading-room">
          <Sidebar collapsible="offcanvas" variant="sidebar" className="border-r">
            <LibrarySidebar />
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="flex-1 overflow-auto">
            <div className="w-full px-6 py-8">
              <Controls />
              <Content />
              <DialogManager />
              <CommandPalette />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <FloatingScrollButtons />
    </div>
  );
}
