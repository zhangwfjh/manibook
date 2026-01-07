import { useState, useMemo } from "react";
import { LibraryDocument } from "@/lib/library";

export function useDocumentSorting(filteredDocuments: LibraryDocument[]) {
  const [sortBy, setSortBy] = useState<string>("title-asc");

  const sortedDocuments = useMemo(() => {
    const sorted = [...filteredDocuments];
    sorted.sort((a, b) => {
      const [field, order] = sortBy.split("-");
      let aVal: string | number | Date, bVal: string | number | Date;

      switch (field) {
        case "title":
          aVal = a.metadata.title.toLowerCase();
          bVal = b.metadata.title.toLowerCase();
          break;
        case "author":
          aVal = a.metadata.authors?.[0]?.toLowerCase() || "";
          bVal = b.metadata.authors?.[0]?.toLowerCase() || "";
          break;
        case "publisher":
          aVal = a.metadata.publisher?.toLowerCase() || "";
          bVal = b.metadata.publisher?.toLowerCase() || "";
          break;
        case "publicationYear":
          aVal = a.metadata.publication_year || 0;
          bVal = b.metadata.publication_year || 0;
          break;
        case "language":
          aVal = a.metadata.language?.toLowerCase() || "";
          bVal = b.metadata.language?.toLowerCase() || "";
          break;
        case "doctype":
          aVal = a.metadata.doctype;
          bVal = b.metadata.doctype;
          break;
        case "numPages":
          aVal = a.metadata.numPages || 0;
          bVal = b.metadata.numPages || 0;
          break;
        case "favorite":
          aVal = a.metadata.favorite ? 1 : 0;
          bVal = b.metadata.favorite ? 1 : 0;
          break;
        case "updatedAt":
          aVal = a.metadata.updatedAt
            ? new Date(a.metadata.updatedAt)
            : new Date(0);
          bVal = b.metadata.updatedAt
            ? new Date(b.metadata.updatedAt)
            : new Date(0);
          break;
        case "filesize":
          aVal = a.metadata.filesize || 0;
          bVal = b.metadata.filesize || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredDocuments, sortBy]);

  return {
    sortBy,
    setSortBy,
    sortedDocuments,
  };
}
