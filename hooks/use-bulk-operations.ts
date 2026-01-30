import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Document } from "@/lib/library";

interface UseBulkOperationsProps {
  documents: Document[];
  filterParams: URLSearchParams;
  sortParams: URLSearchParams;
  loadFilteredData: (filterParams: URLSearchParams | undefined, sortParams: URLSearchParams | undefined, forceRefresh?: boolean) => Promise<void>;
  resetBulkDeleteDialog: () => void;
}

export function useBulkOperations({
  documents,
  filterParams,
  sortParams,
  loadFilteredData,
  resetBulkDeleteDialog,
}: UseBulkOperationsProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedDocuments(new Set());
  };

  const handleToggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAllDocuments = () => {
    const allIds = documents.map((doc) => doc.id);
    setSelectedDocuments(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedDocuments(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{ deletedCount: number; errors?: unknown }>("delete_documents", {
        documentIds: Array.from(selectedDocuments)
      });

      toast.success(
        `Successfully deleted ${result.deletedCount} document(s)`
      );
      resetBulkDeleteDialog();
      setSelectedDocuments(new Set());
      setSelectionMode(false);
      await loadFilteredData(filterParams, sortParams, true);
    } catch (error) {
      console.error("Error bulk deleting documents:", error);
      toast.error("Failed to delete documents");
    }
  };

  const handleBulkMove = async (doctype: string, category: string) => {
    if (selectedDocuments.size === 0) return;

    try {
      const result = await invoke<{ movedCount: number; errorCount: number; errors?: unknown }>("move_documents", {
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
  };

  return {
    selectionMode,
    selectedDocuments,
    handleToggleSelectionMode,
    handleToggleDocumentSelection,
    handleSelectAllDocuments,
    handleClearSelection,
    handleBulkDelete,
    handleBulkMove,
  };
}
