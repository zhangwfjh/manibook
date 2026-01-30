import { LibraryDocument } from '@/lib/library';
import { useLibraryContext } from '@/contexts/LibraryContext';

export function useHomeHandlers(
  setSelectedDocument: (doc: LibraryDocument | null) => void,
  setDialogOpen: (open: boolean) => void,
  selectionMode: boolean,
  handleToggleDocumentSelection: (id: string) => void
) {
  const { handleDocumentUpdate } = useLibraryContext();

  const handleDocumentClick = (document: LibraryDocument) => {
    if (selectionMode) {
      handleToggleDocumentSelection(document.id);
    } else {
      setSelectedDocument(document);
      setDialogOpen(true);
    }
  };

  const handleDocumentUpdateWrapper = async (updatedDoc: LibraryDocument) => {
    const resultDoc = await handleDocumentUpdate(updatedDoc);
    if (resultDoc) {
      setSelectedDocument(resultDoc);
    }
  };

  return {
    handleDocumentClick,
    handleDocumentUpdate: handleDocumentUpdateWrapper,
  };
}