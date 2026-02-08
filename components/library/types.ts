export type SortOption =
  | "title-asc" | "title-desc"
  | "author-asc" | "author-desc"
  | "publication_year-desc" | "publication_year-asc"
  | "page_count-asc" | "page_count-desc"
  | "imported_at-desc" | "imported_at-asc"
  | "filesize-asc" | "filesize-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "author-asc", label: "Author A-Z" },
  { value: "author-desc", label: "Author Z-A" },
  { value: "publication_year-desc", label: "Publication Year Newest" },
  { value: "publication_year-asc", label: "Publication Year Oldest" },
  { value: "page_count-asc", label: "Pages Fewest" },
  { value: "page_count-desc", label: "Pages Most" },
  { value: "imported_at-desc", label: "Recently Imported" },
  { value: "imported_at-asc", label: "Least Recently Imported" },
  { value: "filesize-asc", label: "File Size Smallest" },
  { value: "filesize-desc", label: "File Size Largest" },
];

export const DOCTYPE_OPTIONS = ["Book", "Paper", "Report", "Manual", "Others"];
