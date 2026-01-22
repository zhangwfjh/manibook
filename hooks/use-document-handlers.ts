import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { LibraryDocument } from "@/lib/library";
import { combineSearchParams } from "@/lib/utils/url-params";

interface UseDocumentHandlersProps {
  currentLibrary: string;
  filterParams: URLSearchParams;
  sortParams: URLSearchParams;
  loadFilteredData: (params: URLSearchParams, forceRefresh?: boolean) => Promise<void>;
}

export function useDocumentHandlers({
  currentLibrary,
  filterParams,
  sortParams,
  loadFilteredData,
}: UseDocumentHandlersProps) {
  const handleOpen = useCallback(
    async (doc: LibraryDocument) => {
      try {
        await invoke("open_document", {
          libraryName: currentLibrary,
          documentId: doc.id
        });
      } catch (error) {
        console.error("Error opening document:", error);
        toast.error("Failed to open document");
      }
    },
    [currentLibrary]
  );

  const handleDocumentDelete = useCallback(
    async (document: LibraryDocument) => {
      try {
        await invoke("delete_documents", {
          libraryName: currentLibrary,
          documentIds: [document.id]
        });
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document");
      }
      const combinedParams = combineSearchParams(filterParams, sortParams);
      await loadFilteredData(combinedParams, true);
    },
    [currentLibrary, filterParams, sortParams, loadFilteredData]
  );

  const handleDocumentUpdate = useCallback(
    async (updatedDoc: LibraryDocument): Promise<LibraryDocument | undefined> => {
      try {
        const result = await invoke<LibraryDocument>("update_document", {
          libraryName: currentLibrary,
          documentId: updatedDoc.id,
          metadata: updatedDoc.metadata,
        });
        const combinedParams = combineSearchParams(filterParams, sortParams);
        await loadFilteredData(combinedParams, true);
        return result;
      } catch (error) {
        console.error("Error updating document:", error);
        toast.error("Failed to update document");
        return updatedDoc;
      }
    },
    [currentLibrary, filterParams, sortParams, loadFilteredData]
  );

  const handleFavoriteToggle = useCallback(
    async (document: LibraryDocument) => {
      const updatedDoc = {
        ...document,
        metadata: {
          ...document.metadata,
          favorite: !document.metadata.favorite
        }
      };
      await handleDocumentUpdate(updatedDoc);
    },
    [handleDocumentUpdate]
  );

  return {
    handleOpen,
    handleDocumentDelete,
    handleDocumentUpdate,
    handleFavoriteToggle,
  };
}
