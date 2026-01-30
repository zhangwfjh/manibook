"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  UploadIcon,
  Loader2Icon,
  CheckSquare2Icon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { SettingsDialog } from "@/components/library/dialogs/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { BulkMoveDropdown } from "./bulk-move-dropdown";
import { ViewMode, SORT_OPTIONS } from "../types";
import { useLibraryContext } from "@/contexts/LibraryContext";
import { useImportContext } from "@/contexts/ImportContext";

export function Controls({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    libraries,
    isSearching,
    selectionMode,
    handleToggleSelectionMode,
    selectedDocuments,
    handleSelectAllDocuments,
    handleClearSelection,
    handleBulkMove,
    setBulkDeleteDialogOpen,
  } = useLibraryContext();

  const { setImportDialogOpen } = useImportContext();
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full lg:w-auto">
          {isSearching ? (
            <Loader2Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          )}
          <Input
            placeholder="Search by title, author, publisher, keywords, or abstract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                <XIcon className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllDocuments}
              >
                <CheckSquare2Icon className="h-4 w-4 mr-2" />
                Select All
              </Button>
              {selectedDocuments.size > 0 && (
                <>
                  <BulkMoveDropdown
                    selectedCount={selectedDocuments.size}
                    onBulkMove={handleBulkMove}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete ({selectedDocuments.size})
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Select
                value={sortBy}
                defaultValue="updatedAt-desc"
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-48">
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
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange("card")}
              >
                <LayoutGridIcon className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewModeChange("list")}
              >
                <ListIcon className="h-4 w-4 mr-2" />
                List
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportDialogOpen(true)}
                disabled={libraries.length === 0}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSelectionMode}
              >
                <CheckSquare2Icon className="h-4 w-4 mr-2" />
                Select
              </Button>
              <SettingsDialog />
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
