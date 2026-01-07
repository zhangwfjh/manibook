import React from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LibraryManager } from "@/components/library/library-manager";
import { TagFilter } from "@/components/library/tag-filter";
import { FormatFilter } from "@/components/library/format-filter";
import { LibraryDocument, LibraryCategory, Library } from "@/lib/library";

interface LibrarySidebarProps {
  libraries: Library[];
  currentLibrary: string;
  categories: LibraryCategory[];
  selectedCategory: string;
  documents: LibraryDocument[];
  selectedTags: string[];
  selectedFormats: string[];
  showFavoritesOnly: boolean;
  onLibrarySelect: (library: string) => void;
  onCategorySelect: (category: string) => void;
  onCreateLibrary: () => void;
  onRenameLibrary: (libraryName: string) => void;
  onArchiveLibrary: (libraryName: string) => void;
  onTagsChange: (tags: string[]) => void;
  onFormatsChange: (formats: string[]) => void;
  onShowFavoritesOnlyChange: (show: boolean) => void;
}

export function LibrarySidebar({
  libraries,
  currentLibrary,
  categories,
  selectedCategory,
  documents,
  selectedTags,
  selectedFormats,
  showFavoritesOnly,
  onLibrarySelect,
  onCategorySelect,
  onCreateLibrary,
  onRenameLibrary,
  onArchiveLibrary,
  onTagsChange,
  onFormatsChange,
  onShowFavoritesOnlyChange,
}: LibrarySidebarProps) {
  return (
    <div className="w-80 shrink-0 space-y-6">
      {/* Library Manager */}
      <LibraryManager
        libraries={libraries}
        currentLibrary={currentLibrary}
        categories={categories}
        selectedCategory={selectedCategory}
        onLibrarySelect={onLibrarySelect}
        onCategorySelect={onCategorySelect}
        onCreateLibrary={onCreateLibrary}
        onRenameLibrary={onRenameLibrary}
        onArchiveLibrary={onArchiveLibrary}
      />

      <Separator />

      {/* Favorites Filter */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Favorites
        </h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="favorites"
            checked={showFavoritesOnly}
            onCheckedChange={onShowFavoritesOnlyChange}
          />
          <Label htmlFor="favorites" className="text-sm">
            Show only favorites
          </Label>
        </div>
      </div>

      <Separator />

      {/* Format Filter */}
      <FormatFilter
        documents={documents}
        selectedFormats={selectedFormats}
        onFormatsChange={onFormatsChange}
      />

      <Separator />

      {/* Tag Filter */}
      <TagFilter
        documents={documents}
        selectedTags={selectedTags}
        onTagsChange={onTagsChange}
      />
    </div>
  );
}
