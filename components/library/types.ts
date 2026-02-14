export type SortOption =
  | "title-asc" | "title-desc"
  | "author-asc" | "author-desc"
  | "publication_year-desc" | "publication_year-asc"
  | "page_count-asc" | "page_count-desc"
  | "imported_at-desc" | "imported_at-asc"
  | "filesize-asc" | "filesize-desc";

export const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "title-asc", labelKey: "views.controls.sortOptions.titleAsc" },
  { value: "title-desc", labelKey: "views.controls.sortOptions.titleDesc" },
  { value: "author-asc", labelKey: "views.controls.sortOptions.authorAsc" },
  { value: "author-desc", labelKey: "views.controls.sortOptions.authorDesc" },
  { value: "publication_year-desc", labelKey: "views.controls.sortOptions.publicationYearDesc" },
  { value: "publication_year-asc", labelKey: "views.controls.sortOptions.publicationYearAsc" },
  { value: "page_count-asc", labelKey: "views.controls.sortOptions.pageCountAsc" },
  { value: "page_count-desc", labelKey: "views.controls.sortOptions.pageCountDesc" },
  { value: "imported_at-desc", labelKey: "views.controls.sortOptions.importedAtDesc" },
  { value: "imported_at-asc", labelKey: "views.controls.sortOptions.importedAtAsc" },
  { value: "filesize-asc", labelKey: "views.controls.sortOptions.filesizeAsc" },
  { value: "filesize-desc", labelKey: "views.controls.sortOptions.filesizeDesc" },
];

export const DOCTYPE_OPTION_KEYS = [
  { value: "Book", labelKey: "common.docTypes.book" },
  { value: "Paper", labelKey: "common.docTypes.paper" },
  { value: "Report", labelKey: "common.docTypes.report" },
  { value: "Manual", labelKey: "common.docTypes.manual" },
  { value: "Others", labelKey: "common.docTypes.others" },
];
