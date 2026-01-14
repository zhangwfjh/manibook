import { useCallback, useState } from "react";
import { toast } from "sonner";
import { LibraryDocument } from "@/lib/library";
import { combineSearchParams } from "@/lib/utils/url-params";

interface UseBulkOperationsProps {
  documents: LibraryDocument[];
  currentLibrary: string;
  filterParams: URLSearchParams;
  sortParams: URLSearchParams;
  loadFilteredData: (params: URLSearchParams, forceRefresh?: boolean) => Promise<void>;
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
      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentIds: Array.from(selectedDocuments) }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast.success(
          `Successfully deleted ${result.deletedCount} document(s)`
        );
        setBulkDeleteDialogOpen(false);
        setSelectedDocuments(new Set());
        setSelectionMode(false);
        const combinedParams = combineSearchParams(filterParams, sortParams);
        await loadFilteredData(combinedParams, true);
      } else {
        toast.error(result.error || "Failed to delete documents");
      }
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
        const response = await fetch(
          `/api/libraries/${currentLibrary}/documents`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentIds: Array.from(selectedDocuments),
              metadata: { doctype, category },
            }),
          }
        );

        const result = await response.json();

        if (response.ok) {
          toast.success(
            `Successfully moved ${result.updatedCount} document(s)`
          );
          setSelectedDocuments(new Set());
          setSelectionMode(false);
          const combinedParams = combineSearchParams(filterParams, sortParams);
          await loadFilteredData(combinedParams, true);
        } else {
          toast.error(result.error || "Failed to move documents");
        }
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
