import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LibraryManager } from "@/components/library/library-manager";
import { GenericFilter } from "@/components/library/generic-filter";
import { LibraryDocument, LibraryCategory, Library } from "@/lib/library";

interface LibrarySidebarProps {
  libraries: Library[];
  currentLibrary: string;
  categories: LibraryCategory[];
  selectedCategory: string;
  documents: LibraryDocument[];
  selectedKeywords?: string[];
  selectedFormats?: string[];
  selectedAuthors?: string[];
  selectedPublishers?: string[];
  showFavoritesOnly?: boolean;
  onLibrarySelect: (library: string) => void;
  onCategorySelect: (category: string) => void;
  onCreateLibrary: () => void;
  onRenameLibrary: (libraryName: string) => void;
  onArchiveLibrary: (libraryName: string) => void;
  onKeywordsChange: (keywords: string[]) => void;
  onFormatsChange: (formats: string[]) => void;
  onAuthorsChange: (authors: string[]) => void;
  onPublishersChange: (publishers: string[]) => void;
  onShowFavoritesOnlyChange: (show: boolean) => void;
}

export function LibrarySidebar({
  libraries,
  currentLibrary,
  categories,
  selectedCategory,
  documents,
  selectedKeywords = [],
  selectedFormats = [],
  selectedAuthors = [],
  selectedPublishers = [],
  showFavoritesOnly = false,
  onLibrarySelect,
  onCategorySelect,
  onCreateLibrary,
  onRenameLibrary,
  onArchiveLibrary,
  onKeywordsChange,
  onFormatsChange,
  onAuthorsChange,
  onPublishersChange,
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

      <GenericFilter
        title="Formats"
        selectedItems={selectedFormats}
        onItemsChange={onFormatsChange}
        documents={documents}
        getItemValues={(doc) =>
          doc.metadata.format ? [doc.metadata.format.toUpperCase()] : []
        }
      />

      <GenericFilter
        title="Keywords"
        selectedItems={selectedKeywords}
        onItemsChange={onKeywordsChange}
        documents={documents}
        getItemValues={(doc) =>
          doc.metadata.keywords?.map((kw) =>
            kw.replace(/\b\w/g, (l: string) => l.toUpperCase())
          ) || []
        }
      />

      <GenericFilter
        title="Authors"
        selectedItems={selectedAuthors}
        onItemsChange={onAuthorsChange}
        documents={documents}
        getItemValues={(doc) =>
          doc.metadata.authors?.map((author) =>
            author.replace(/\b\w/g, (l: string) => l.toUpperCase())
          ) || []
        }
      />

      <GenericFilter
        title="Publishers"
        selectedItems={selectedPublishers}
        onItemsChange={onPublishersChange}
        documents={documents}
        getItemValues={(doc) =>
          doc.metadata.publisher ? [doc.metadata.publisher] : []
        }
      />
    </div>
  );
}
