import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  FolderIcon,
} from "lucide-react";
import { SettingsDialog } from "@/components/library/settings-dialog";

type ViewMode = "card" | "list";

interface LibraryControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  librariesLength: number;
  uploading: boolean;
  uploadProgress: string;
  uploadProgressPercent: number;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LibraryControls({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  librariesLength,
  uploading,
  uploadProgress,
  uploadProgressPercent,
  onUploadFiles,
  onUploadFolder,
  fileInputRef,
  folderInputRef,
  onFileUpload,
}: LibraryControlsProps) {
  return (
    <div className="mb-6 space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, author, publisher, or keywords..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
              <SelectItem value="author-asc">Author A-Z</SelectItem>
              <SelectItem value="author-desc">Author Z-A</SelectItem>
              <SelectItem value="publisher-asc">
                Publisher A-Z
              </SelectItem>
              <SelectItem value="publisher-desc">
                Publisher Z-A
              </SelectItem>
              <SelectItem value="publicationYear-desc">
                Publication Year Newest
              </SelectItem>
              <SelectItem value="publicationYear-asc">
                Publication Year Oldest
              </SelectItem>
              <SelectItem value="language-asc">Language A-Z</SelectItem>
              <SelectItem value="language-desc">
                Language Z-A
              </SelectItem>
              <SelectItem value="doctype-asc">Type A-Z</SelectItem>
              <SelectItem value="doctype-desc">Type Z-A</SelectItem>
              <SelectItem value="numPages-asc">Pages Fewest</SelectItem>
              <SelectItem value="numPages-desc">Pages Most</SelectItem>
              <SelectItem value="favorite-desc">
                Favorites First
              </SelectItem>
              <SelectItem value="favorite-asc">
                Non-Favorites First
              </SelectItem>
              <SelectItem value="updatedAt-desc">
                Recently Updated
              </SelectItem>
              <SelectItem value="updatedAt-asc">
                Least Recently Updated
              </SelectItem>
              <SelectItem value="filesize-asc">
                File Size Smallest
              </SelectItem>
              <SelectItem value="filesize-desc">
                File Size Largest
              </SelectItem>
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
            onClick={onUploadFiles}
            disabled={librariesLength === 0}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUploadFolder}
            disabled={librariesLength === 0}
          >
            <FolderIcon className="h-4 w-4 mr-2" />
            Upload Folder
          </Button>
          <SettingsDialog />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.djvu"
            multiple
            onChange={onFileUpload}
            style={{ display: "none" }}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".pdf,.epub,.djvu"
            multiple
            // @ts-expect-error - webkitdirectory is not in the standard types
            webkitdirectory=""
            onChange={onFileUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <div className="space-y-2">
          <div className="text-sm text-blue-600 dark:text-blue-400">
            {uploading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                {uploadProgress}
              </div>
            )}
            {!uploading && uploadProgress}
          </div>
          {uploading && uploadProgressPercent > 0 && (
            <Progress
              value={uploadProgressPercent}
              className="w-full"
            />
          )}
        </div>
      )}
    </div>
  );
}
