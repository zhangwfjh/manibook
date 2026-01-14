import { useCallback } from "react";
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
    (doc: LibraryDocument) => {
      const safeTitle = doc.metadata.title.replace(/[\/\\?%*:|"<>]/g, "_");
      const filename = `${safeTitle}.${doc.metadata.format}`;
      const fileUrl = `/api/libraries/${currentLibrary}/documents/${doc.id}/${filename}`;
      window.open(fileUrl, "_blank");
    },
    [currentLibrary]
  );

  const handleDocumentDelete = useCallback(
    async (document: LibraryDocument) => {
      try {
        await fetch(
          `/api/libraries/${currentLibrary}/documents/${document.id}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error("Error deleting document:", error);
      }
      const combinedParams = combineSearchParams(filterParams, sortParams);
      await loadFilteredData(combinedParams, true);
    },
    [currentLibrary, filterParams, sortParams, loadFilteredData]
  );

  const handleDocumentUpdate = useCallback(
    async (updatedDoc: LibraryDocument) => {
      try {
        const response = await fetch(
          `/api/libraries/${currentLibrary}/documents/${updatedDoc.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              metadata: updatedDoc.metadata,
            }),
          }
        );
        if (response.ok) {
          const result = await response.json();
          const combinedParams = combineSearchParams(filterParams, sortParams);
          await loadFilteredData(combinedParams, true);
          return result.document;
        } else {
          console.error("Error updating document");
          return updatedDoc;
        }
      } catch (error) {
        console.error("Error updating document:", error);
        return updatedDoc;
      }
    },
    [currentLibrary, filterParams, sortParams, loadFilteredData]
  );

  const handleFavoriteToggle = useCallback(
    async (document: LibraryDocument) => {
      try {
        await fetch(
          `/api/libraries/${currentLibrary}/documents/${document.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ favorite: !document.metadata.favorite }),
          }
        );
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
      const combinedParams = combineSearchParams(filterParams, sortParams);
      await loadFilteredData(combinedParams, true);
    },
    [currentLibrary, filterParams, sortParams, loadFilteredData]
  );

  return {
    handleOpen,
    handleDocumentDelete,
    handleDocumentUpdate,
    handleFavoriteToggle,
  };
}
