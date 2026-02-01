"use client";

import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shelf } from "./shelf";
import { Filter } from "@/components/ui/filter";
import { useLibraryContext } from "@/contexts/LibraryContext";

export function Sidebar() {
  const {
    selectedKeywords,
    selectedFormats,
    selectedAuthors,
    selectedPublishers,
    selectedLanguages,
    showFavoritesOnly,
    filterOptions,
    setSelectedKeywords,
    setSelectedFormats,
    setSelectedAuthors,
    setSelectedPublishers,
    setSelectedLanguages,
    setShowFavoritesOnly,
  } = useLibraryContext();

  return (
    <div className="w-80 shrink-0 space-y-6">
      <Shelf />

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Filters
        </h3>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="favorites"
          checked={showFavoritesOnly}
          onCheckedChange={setShowFavoritesOnly}
        />
        <Label htmlFor="favorites" className="text-sm">
          Show only favorites
        </Label>
      </div>

      <Filter
        title="Formats"
        selectedItems={selectedFormats}
        onItemsChange={setSelectedFormats}
        filterOptions={filterOptions.formats}
      />

      <Filter
        title="Keywords"
        selectedItems={selectedKeywords}
        onItemsChange={setSelectedKeywords}
        filterOptions={filterOptions.keywords}
      />

      <Filter
        title="Authors"
        selectedItems={selectedAuthors}
        onItemsChange={setSelectedAuthors}
        filterOptions={filterOptions.authors}
      />

      <Filter
        title="Publishers"
        selectedItems={selectedPublishers}
        onItemsChange={setSelectedPublishers}
        filterOptions={filterOptions.publishers}
      />

      <Filter
        title="Languages"
        selectedItems={selectedLanguages}
        onItemsChange={setSelectedLanguages}
        filterOptions={filterOptions.languages || {}}
      />
    </div>
  );
}
