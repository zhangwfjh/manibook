import { useCallback } from 'react';
import { LibraryDocument } from '@/lib/library';
import { useLibraryContext } from '@/contexts/LibraryContext';

export function useHomeHandlers(
  setSelectedDocument: (doc: LibraryDocument | null) => void,
  setDialogOpen: (open: boolean) => void,
  selectionMode: boolean,
  handleToggleDocumentSelection: (id: string) => void,
  setSelectedCategory: (category: string) => void
) {
  const { handleDocumentUpdate } = useLibraryContext();

  const handleDocumentClick = useCallback(
    (document: LibraryDocument) => {
      if (selectionMode) {
        handleToggleDocumentSelection(document.id);
      } else {
        setSelectedDocument(document);
        setDialogOpen(true);
      }
    },
    [selectionMode, handleToggleDocumentSelection, setSelectedDocument, setDialogOpen]
  );

  const handleDocumentUpdateWrapper = useCallback(async (updatedDoc: LibraryDocument) => {
    const resultDoc = await handleDocumentUpdate(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
  }, [handleDocumentUpdate, setSelectedDocument]);

  const handleBreadcrumbClick = useCallback(
    (category: string) => {
      setSelectedCategory(category);
    },
    [setSelectedCategory]
  );

  return {
    handleDocumentClick,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
    handleBreadcrumbClick,
  };
}