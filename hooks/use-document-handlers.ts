import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Document } from "@/lib/library";

interface UseDocumentHandlersProps {
  filterParams: URLSearchParams;
  sortParams: URLSearchParams;
  loadFilteredData: (filterParams: URLSearchParams | undefined, sortParams: URLSearchParams | undefined, forceRefresh?: boolean) => Promise<void>;
}

export function useDocumentHandlers({
  filterParams,
  sortParams,
  loadFilteredData,
}: UseDocumentHandlersProps) {
  const handleOpen = async (doc: Document) => {
    try {
      await invoke("open_document", {
        documentId: doc.id
      });
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  };

  const handleDocumentDelete = async (document: Document) => {
    try {
      await invoke("delete_documents", {
        documentIds: [document.id]
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
    await loadFilteredData(filterParams, sortParams, true);
  };

  const handleDocumentUpdate = async (updatedDoc: Document): Promise<Document | undefined> => {
    try {
      const result = await invoke<Document>("update_document", {
        documentId: updatedDoc.id,
        metadata: updatedDoc.metadata,
      });
      await loadFilteredData(filterParams, sortParams, true);
      return result;
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to update document");
      return updatedDoc;
    }
  };

  const handleFavoriteToggle = async (document: Document) => {
    const updatedDoc = {
      ...document,
      metadata: {
        ...document.metadata,
        favorite: !document.metadata.favorite
      }
    };
    await handleDocumentUpdate(updatedDoc);
  };

  return {
    handleOpen,
    handleDocumentDelete,
    handleDocumentUpdate,
    handleFavoriteToggle,
  };
}
