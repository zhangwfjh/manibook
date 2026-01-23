import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { LibraryDocument } from "@/lib/library";

interface UseBulkOperationsProps {
  documents: LibraryDocument[];
  currentLibrary: string;
  filterParams: URLSearchParams;
  sortParams: URLSearchParams;
  loadFilteredData: (filterParams: URLSearchParams | undefined, sortParams: URLSearchParams | undefined, forceRefresh?: boolean) => Promise<void>;
}

export function useBulkOperations({
  documents,
  currentLibrary,
  filterParams,
  sortParams,
  loadFilteredData,
}: UseBulkOperationsProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const handleToggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => !prev);
    setSelectedDocuments(new Set());
  }, []);

  const handleToggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllDocuments = useCallback(() => {
    const allIds = documents.map((doc) => doc.id);
    setSelectedDocuments(new Set(allIds));
  }, [documents]);

  const handleClearSelection = useCallback(() => {
    setSelectedDocuments(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{ deletedCount: number; errors?: unknown }>("delete_documents", {
        libraryName: currentLibrary,
        documentIds: Array.from(selectedDocuments)
      });

      toast.success(
        `Successfully deleted ${result.deletedCount} document(s)`
      );
      setBulkDeleteDialogOpen(false);
      setSelectedDocuments(new Set());
      setSelectionMode(false);
      await loadFilteredData(filterParams, sortParams, true);
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast.error("Failed to delete documents");
    }
  }, [
    selectedDocuments,
    currentLibrary,
    filterParams,
    sortParams,
    loadFilteredData,
  ]);

  const handleBulkMove = useCallback(
    async (doctype: string, category: string) => {
      if (selectedDocuments.size === 0) return;

      try {
        const result = await invoke<{ movedCount: number; errorCount: number; errors?: unknown }>("move_documents", {
          libraryName: currentLibrary,
          documentIds: Array.from(selectedDocuments),
          doctype,
          category,
        });

        toast.success(
          `Successfully moved ${result.movedCount} document(s)`
        );
        if (result.errorCount > 0) {
          toast.error(`Failed to move ${result.errorCount} document(s)`);
        }
        setSelectedDocuments(new Set());
        setSelectionMode(false);
        await loadFilteredData(filterParams, sortParams, true);
      } catch (error) {
        console.error("Error bulk moving documents:", error);
        toast.error("Failed to move documents");
      }
    },
    [
      selectedDocuments,
      currentLibrary,
      filterParams,
      sortParams,
      loadFilteredData,
    ]
  );

  return {
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
  };
}
