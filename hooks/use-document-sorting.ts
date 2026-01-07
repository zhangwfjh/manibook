import { useState, useMemo } from "react";
import { LibraryDocument } from "@/lib/library";

export function useDocumentSorting(filteredDocuments: LibraryDocument[]) {
  const [sortBy, setSortBy] = useState<string>("createdAt-desc");

  // For backward compatibility, provide sorted documents
  // Since server-side sorting is now used, this mainly ensures consistent ordering
  // within the current page if needed
  const sortedDocuments = useMemo(() => {
    // Since sorting is now done server-side, we just return the documents as-is
    // This maintains backward compatibility for components that expect sortedDocuments
    return filteredDocuments;
  }, [filteredDocuments]);

  // Get sort parameters for API calls
  const sortParams = useMemo(() => {
    const params = new URLSearchParams();
    if (sortBy) {
      params.set('sortBy', sortBy);
    }
    return params;
  }, [sortBy]);

  return {
    sortBy,
    setSortBy,
    sortedDocuments,
    sortParams,
  };
}
