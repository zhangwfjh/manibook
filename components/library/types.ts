export type SortOption =
  | "title-asc" | "title-desc"
  | "author-asc" | "author-desc"
  | "publicationYear-desc" | "publicationYear-asc"
  | "numPages-asc" | "numPages-desc"
  | "updatedAt-desc" | "updatedAt-asc"
  | "filesize-asc" | "filesize-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "author-asc", label: "Author A-Z" },
  { value: "author-desc", label: "Author Z-A" },
  { value: "publicationYear-desc", label: "Publication Year Newest" },
  { value: "publicationYear-asc", label: "Publication Year Oldest" },
  { value: "numPages-asc", label: "Pages Fewest" },
  { value: "numPages-desc", label: "Pages Most" },
  { value: "updatedAt-desc", label: "Recently Updated" },
  { value: "updatedAt-asc", label: "Least Recently Updated" },
  { value: "filesize-asc", label: "File Size Smallest" },
  { value: "filesize-desc", label: "File Size Largest" },
];

export const DOCTYPE_OPTIONS = ["Book", "Paper", "Report", "Manual", "Others"];
