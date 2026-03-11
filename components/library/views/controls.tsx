"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  SearchIcon,
  UploadIcon,
  Loader2Icon,
  CheckSquare2Icon,
  TrashIcon,
  XIcon,
  SettingsIcon,
} from "lucide-react";
import { BulkMoveDropdown } from "@/components/library/features/move-dropdown";
import { SortOption } from "@/components/library/types";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryUIStore,
  useLibraryOperations,
  useImportStore,
} from "@/stores";

export function Controls() {
  const t = useTranslations("views.controls");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { searchQuery, setSearchQuery } = useLibraryFilterStore();
  const { sortBy, setSortBy } = useLibraryUIStore();
  const { libraries, libraryName } = useLibraryDataStore();
  const { isSearching } = useLibraryFilterStore();
  const {
    selectionMode,
    toggleSelectionMode,
    selectedDocuments,
    selectAllDocuments,
    clearSelection,
    setBulkDeleteDialogOpen,
    setSettingsOpen,
  } = useLibraryUIStore();
  const { bulkMove } = useLibraryOperations();
  const { setImportDialogOpen } = useImportStore();

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "title-asc", label: t("sortOptions.titleAsc") },
    { value: "title-desc", label: t("sortOptions.titleDesc") },
    { value: "author-asc", label: t("sortOptions.authorAsc") },
    { value: "author-desc", label: t("sortOptions.authorDesc") },
    {
      value: "publication_year-desc",
      label: t("sortOptions.publicationYearDesc"),
    },
    {
      value: "publication_year-asc",
      label: t("sortOptions.publicationYearAsc"),
    },
    { value: "page_count-asc", label: t("sortOptions.pageCountAsc") },
    { value: "page_count-desc", label: t("sortOptions.pageCountDesc") },
    { value: "imported_at-desc", label: t("sortOptions.importedAtDesc") },
    { value: "imported_at-asc", label: t("sortOptions.importedAtAsc") },
    { value: "filesize-asc", label: t("sortOptions.filesizeAsc") },
    { value: "filesize-desc", label: t("sortOptions.filesizeDesc") },
  ];

  // Keyboard shortcut handler (/ to focus search)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-row gap-4 justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md w-full lg:w-auto">
          <SidebarTrigger className="shrink-0 hover:bg-muted/80 transition-colors duration-200" />
          <InputGroup className="flex-1 relative">
            <InputGroupInput
              ref={searchInputRef}
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              {isSearching ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SearchIcon />
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectionMode ? (
            <div className="flex flex-wrap items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md border border-primary/20">
                <span className="text-sm font-medium text-primary">
                  {t("selected", { count: selectedDocuments.size })}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <XIcon className="h-4 w-4 mr-2" />
                {t("clear")}
              </Button>
              <Button variant="outline" size="sm" onClick={selectAllDocuments}>
                <CheckSquare2Icon className="h-4 w-4 mr-2" />
                {t("selectAll")}
              </Button>
              {selectedDocuments.size > 0 && (
                <>
                  <BulkMoveDropdown
                    onBulkMove={(doctype, category) =>
                      bulkMove(Array.from(selectedDocuments), doctype, category)
                    }
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="shadow-sm hover:shadow-md transition-all"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className="hover:bg-muted/80 transition-colors"
              >
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 pr-2 border-r border-border/50">
                <Select
                  value={sortBy}
                  defaultValue="imported_at-desc"
                  onValueChange={setSortBy}
                >
                  <SelectTrigger className="w-44 h-8 hover:bg-muted/80 transition-colors">
                    <SelectValue placeholder={t("sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                disabled={!libraryName}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                {t("import")}
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="hover:bg-muted/80 transition-colors"
                >
                  <CheckSquare2Icon className="h-4 w-4 mr-2" />
                  {t("select")}
                </Button>
              </div>
              <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  {t("settings")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
