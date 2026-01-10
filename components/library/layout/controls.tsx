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
} from "lucide-react";
import { SettingsDialog } from "@/components/library/dialogs/settings-dialog";

type ViewMode = "card" | "list";

interface ControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  librariesLength: number;
  onOpenUploadDialog: () => void;
  isSearching?: boolean;
}

export function Controls({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  librariesLength,
  onOpenUploadDialog,
  isSearching = false,
}: ControlsProps) {
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
            placeholder="Search by title, author, publisher, or keywords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={sortBy}
            defaultValue="updatedAt-desc"
            onValueChange={onSortChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
              <SelectItem value="author-asc">Author A-Z</SelectItem>
              <SelectItem value="author-desc">Author Z-A</SelectItem>
              <SelectItem value="publisher-asc">Publisher A-Z</SelectItem>
              <SelectItem value="publisher-desc">Publisher Z-A</SelectItem>
              <SelectItem value="publicationYear-desc">
                Publication Year Newest
              </SelectItem>
              <SelectItem value="publicationYear-asc">
                Publication Year Oldest
              </SelectItem>
              <SelectItem value="language-asc">Language A-Z</SelectItem>
              <SelectItem value="language-desc">Language Z-A</SelectItem>
              <SelectItem value="doctype-asc">Type A-Z</SelectItem>
              <SelectItem value="doctype-desc">Type Z-A</SelectItem>
              <SelectItem value="numPages-asc">Pages Fewest</SelectItem>
              <SelectItem value="numPages-desc">Pages Most</SelectItem>
              <SelectItem value="favorite-desc">Favorites First</SelectItem>
              <SelectItem value="favorite-asc">Non-Favorites First</SelectItem>
              <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
              <SelectItem value="updatedAt-asc">
                Least Recently Updated
              </SelectItem>
              <SelectItem value="filesize-asc">File Size Smallest</SelectItem>
              <SelectItem value="filesize-desc">File Size Largest</SelectItem>
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
            onClick={onOpenUploadDialog}
            disabled={librariesLength === 0}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <SettingsDialog />
        </div>
      </div>
    </div>
  );
}
