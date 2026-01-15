import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  PlusIcon,
  LibraryIcon,
  MoreHorizontalIcon,
  EditIcon,
  TrashIcon,
  StarIcon,
  FolderOpenIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LibraryCategory } from "@/lib/library";
import { Library } from "@/lib/library";
import { useLibraryContext } from "@/contexts/LibraryContext";

interface LibraryNodeProps {
  library: Library;
  isCurrent: boolean;
  isExpanded: boolean;
  categories: LibraryCategory[];
  selectedCategory: string;
  onToggleExpanded: (libraryName: string) => void;
  onCategorySelect: (categoryPath: string) => void;
  onRenameLibrary: (libraryName: string) => void;
  onMoveLibrary: (libraryName: string, currentPath: string) => void;
  onArchiveLibrary: (libraryName: string) => void;
}

interface CategoryNodeProps {
  category: LibraryCategory;
  level: number;
  selectedCategory: string;
  onCategorySelect: (categoryPath: string) => void;
  expandedNodes: Set<string>;
  onToggleExpanded: (path: string) => void;
}

function CategoryNode({
  category,
  level,
  selectedCategory,
  onCategorySelect,
  expandedNodes,
  onToggleExpanded,
}: CategoryNodeProps) {
  const pathKey = category.path.join(" > ");
  const isExpanded = expandedNodes.has(pathKey);
  const isSelected = selectedCategory === pathKey;
  const hasChildren = category.children.length > 0;

  return (
    <div>
      <Button
        variant={isSelected ? "secondary" : "ghost"}
        size="sm"
        className={`w-full justify-start h-8 px-${level * 4 + 8} text-left`}
        onClick={() => {
          onCategorySelect(pathKey);
          if (hasChildren) {
            onToggleExpanded(pathKey);
          }
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 mr-1" />
          )
        ) : (
          <div className="w-5 mr-1" />
        )}
        <FolderIcon className="h-4 w-4 mr-2" />
        <span className="truncate">{category.name}</span>
        {category.documents.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            ({category.documents.length})
          </span>
        )}
      </Button>

      {isExpanded && hasChildren && (
        <div className="ml-4">
          {category.children.map((child, index) => (
            <CategoryNode
              key={index}
              category={child}
              level={level + 1}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryNode({
  library,
  isCurrent,
  isExpanded,
  categories,
  selectedCategory,
  onToggleExpanded,
  onCategorySelect,
  onRenameLibrary,
  onMoveLibrary,
  onArchiveLibrary: onArchiveLibrary,
}: LibraryNodeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (path: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleSetAsDefault = async () => {
    try {
      const response = await fetch("/api/libraries/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ defaultLibrary: library.name }),
      });
      if (!response.ok) {
        console.error("Failed to set default library");
      }
    } catch (error) {
      console.error("Error setting default library:", error);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <Button
          variant={isCurrent ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 justify-start h-8 text-left"
          onClick={() => {
            onToggleExpanded(library.name);
            onCategorySelect("");
          }}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 mr-1" />
          )}
          <LibraryIcon className="h-4 w-4 mr-2" />
          <span className="truncate flex-1">{library.name}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-1">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSetAsDefault}>
              <StarIcon className="h-4 w-4 mr-2" />
              Set as Default
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRenameLibrary(library.name)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Rename Library
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onMoveLibrary(library.name, library.path)}
            >
              <FolderOpenIcon className="h-4 w-4 mr-2" />
              Move Library
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onArchiveLibrary(library.name)}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Archive Library
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="ml-6">
          <div className="text-xs text-muted-foreground mb-1 truncate">
            {library.path}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="ml-6 space-y-1">
          {categories.map((category, index) => (
            <CategoryNode
              key={index}
              category={category}
              level={0}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
              expandedNodes={expandedNodes}
              onToggleExpanded={handleToggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Shelf() {
  const {
    libraries,
    currentLibrary,
    categories,
    selectedCategory,
    setCurrentLibrary,
    setSelectedCategory,
    setCreateLibraryOpen,
    handleOpenRenameDialog,
    handleOpenMoveDialog,
    handleOpenArchiveDialog,
  } = useLibraryContext();

  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(
    new Set([currentLibrary])
  );

  const handleLibraryToggle = (libraryName: string) => {
    setCurrentLibrary(libraryName);

    setExpandedLibraries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(libraryName)) {
        newSet.delete(libraryName);
      } else {
        newSet.clear();
        newSet.add(libraryName);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Libraries
      </h3>
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {libraries.map((library) => (
            <LibraryNode
              key={library.name}
              library={library}
              isCurrent={library.name === currentLibrary}
              isExpanded={expandedLibraries.has(library.name)}
              categories={library.name === currentLibrary ? categories : []}
              selectedCategory={
                library.name === currentLibrary ? selectedCategory : ""
              }
              onToggleExpanded={handleLibraryToggle}
              onCategorySelect={setSelectedCategory}
              onRenameLibrary={handleOpenRenameDialog}
              onMoveLibrary={handleOpenMoveDialog}
              onArchiveLibrary={handleOpenArchiveDialog}
            />
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-left text-muted-foreground"
            onClick={() => setCreateLibraryOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Create New Library
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
