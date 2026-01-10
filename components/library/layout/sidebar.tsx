import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shelf } from "@/components/library/core/shelf";
import { Filter } from "@/components/library/ui/filter";
import { LibraryCategory, Library } from "@/lib/library";

interface SidebarProps {
  libraries: Library[];
  currentLibrary: string;
  categories: LibraryCategory[];
  selectedCategory: string;
  selectedKeywords?: string[];
  selectedFormats?: string[];
  selectedAuthors?: string[];
  selectedPublishers?: string[];
  showFavoritesOnly?: boolean;
  filterOptions?: Record<string, Record<string, number>>;
  onLibrarySelect: (library: string) => void;
  onCategorySelect: (category: string) => void;
  onCreateLibrary: () => void;
  onRenameLibrary: (libraryName: string) => void;
  onMoveLibrary: (libraryName: string, currentPath: string) => void;
  onArchiveLibrary: (libraryName: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onFormatsChange: (formats: string[]) => void;
  onAuthorsChange: (authors: string[]) => void;
  onPublishersChange: (publishers: string[]) => void;
  onShowFavoritesOnlyChange: (show: boolean) => void;
}

export function Sidebar({
  libraries,
  currentLibrary,
  categories,
  selectedCategory,
  selectedKeywords = [],
  selectedFormats = [],
  selectedAuthors = [],
  selectedPublishers = [],
  showFavoritesOnly = false,
  filterOptions = {},
  onLibrarySelect,
  onCategorySelect,
  onCreateLibrary,
  onRenameLibrary,
  onMoveLibrary,
  onArchiveLibrary,
  onKeywordsChange,
  onFormatsChange,
  onAuthorsChange,
  onPublishersChange,
  onShowFavoritesOnlyChange,
}: SidebarProps) {
  return (
    <div className="w-80 shrink-0 space-y-6">
      <Shelf
        libraries={libraries}
        currentLibrary={currentLibrary}
        categories={categories}
        selectedCategory={selectedCategory}
        onLibrarySelect={onLibrarySelect}
        onCategorySelect={onCategorySelect}
        onCreateLibrary={onCreateLibrary}
        onRenameLibrary={onRenameLibrary}
        onMoveLibrary={onMoveLibrary}
        onArchiveLibrary={onArchiveLibrary}
      />

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
          onCheckedChange={onShowFavoritesOnlyChange}
        />
        <Label htmlFor="favorites" className="text-sm">
          Show only favorites
        </Label>
      </div>

      <Filter
        title="Formats"
        selectedItems={selectedFormats}
        onItemsChange={onFormatsChange}
        filterOptions={filterOptions.formats}
      />

      <Filter
        title="Keywords"
        selectedItems={selectedKeywords}
        onItemsChange={onKeywordsChange}
        filterOptions={filterOptions.keywords}
      />

      <Filter
        title="Authors"
        selectedItems={selectedAuthors}
        onItemsChange={onAuthorsChange}
        filterOptions={filterOptions.authors}
      />

      <Filter
        title="Publishers"
        selectedItems={selectedPublishers}
        onItemsChange={onPublishersChange}
        filterOptions={filterOptions.publishers}
      />
    </div>
  );
}
