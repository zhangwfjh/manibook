import { Sidebar } from "@/components/library/layout/sidebar";
import { Controls } from "@/components/library/layout/controls";
import { Content } from "@/components/library/core/content";
import { LibraryDocument } from "@/lib/library";
import { ViewMode } from "@/lib/types/common";

interface HomeMainProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setImportDialogOpen: (open: boolean) => void;
  handleDocumentClick: (document: LibraryDocument) => void;
}

export function HomeMain({
  viewMode,
  setViewMode,
  setImportDialogOpen,
  handleDocumentClick,
}: HomeMainProps) {

  return (
    <div className="flex gap-10 lg:gap-12">
      <Sidebar />

      <div className="flex-1 min-w-0">
        <Controls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenImportDialog={() => setImportDialogOpen(true)}
        />

        <Content
          viewMode={viewMode}
          onDocumentClick={handleDocumentClick}
        />
      </div>
    </div>
  );
}