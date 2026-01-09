import { useState, useMemo } from "react";

export function useDocumentSorting() {
  const [sortBy, setSortBy] = useState<string>("updatedAt-desc");

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
    sortParams,
  };
}
