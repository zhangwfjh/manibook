"use client";

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
} from "lucide-react";
import { SettingsDialog } from "@/components/library/dialogs/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { BulkMoveDropdown } from "@/components/library/features/move-dropdown";
import { SORT_OPTIONS } from "@/components/library/types";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryUIStore,
  useLibraryOperations,
  useImportStore,
} from "@/stores";

export function Controls() {
  const { searchQuery, setSearchQuery } = useLibraryFilterStore();
  const { sortBy, setSortBy } = useLibraryUIStore();
  const { libraries } = useLibraryDataStore();
  const { isSearching } = useLibraryFilterStore();
  const {
    selectionMode,
    toggleSelectionMode,
    selectedDocuments,
    selectAllDocuments,
    clearSelection,
    setBulkDeleteDialogOpen,
  } = useLibraryUIStore();
  const { bulkMove } = useLibraryOperations();
  const { setImportDialogOpen } = useImportStore();

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md w-full lg:w-auto">
          <SidebarTrigger className="shrink-0 hover:bg-muted/80 transition-colors duration-200" />
          <InputGroup className="flex-1 relative">
            <InputGroupInput
              placeholder="Search by title, author, publisher, keywords, or abstract...  "
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
                  {selectedDocuments.size} selected
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <XIcon className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={selectAllDocuments}>
                <CheckSquare2Icon className="h-4 w-4 mr-2" />
                Select All
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
                    Delete
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectionMode}
                className="hover:bg-muted/80 transition-colors"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-1.5 pr-2 border-r border-border/50">
                <Select
                  value={sortBy}
                  defaultValue="created_at-desc"
                  onValueChange={setSortBy}
                >
                  <SelectTrigger className="w-44 h-8 hover:bg-muted/80 transition-colors">
                    <SelectValue placeholder="Sort by..." />
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
                disabled={libraries.length === 0}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Import
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="hover:bg-muted/80 transition-colors"
                >
                  <CheckSquare2Icon className="h-4 w-4 mr-2" />
                  Select
                </Button>
              </div>
              <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                <SettingsDialog />
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
