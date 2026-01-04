import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FileTextIcon, PlusIcon, LibraryIcon, MoreHorizontalIcon, EditIcon, TrashIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LibraryCategory } from '@/lib/library';
import { Library } from '@/lib/libraries';

interface LibraryManagerProps {
  libraries: Library[];
  currentLibrary: string;
  categories: LibraryCategory[];
  selectedCategory: string;
  onLibrarySelect: (libraryName: string) => void;
  onCategorySelect: (categoryPath: string) => void;
  onCreateLibrary: () => void;
  onRenameLibrary: (libraryName: string) => void;
  onArchiveLibrary: (libraryName: string) => void;
}

interface LibraryNodeProps {
  library: Library;
  isCurrent: boolean;
  isExpanded: boolean;
  categories: LibraryCategory[];
  selectedCategory: string;
  documentCount: number;
  onToggleExpanded: (libraryName: string) => void;
  onCategorySelect: (categoryPath: string) => void;
  onRenameLibrary: (libraryName: string) => void;
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

function CategoryNode({ category, level, selectedCategory, onCategorySelect, expandedNodes, onToggleExpanded }: CategoryNodeProps) {
  const pathKey = category.path.join(' > ');
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
          if (hasChildren) {
            onToggleExpanded(pathKey);
          } else {
            onCategorySelect(pathKey);
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
        {hasChildren ? (
          <FolderIcon className="h-4 w-4 mr-2" />
        ) : (
          <FileTextIcon className="h-4 w-4 mr-2" />
        )}
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

function LibraryNode({ library, isCurrent, isExpanded, categories, selectedCategory, documentCount, onToggleExpanded, onCategorySelect, onRenameLibrary, onArchiveLibrary: onArchiveLibrary }: LibraryNodeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const handleToggleExpanded = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <Button
          variant={isCurrent ? "secondary" : "ghost"}
          size="sm"
          className="flex-1 justify-start h-8 text-left"
          onClick={() => onToggleExpanded(library.name)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 mr-1" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 mr-1" />
          )}
          <LibraryIcon className="h-4 w-4 mr-2" />
          <span className="truncate flex-1">{library.name}</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({documentCount})
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-1">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRenameLibrary(library.name)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Rename Library
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
        <div className="ml-6 space-y-1">
          <Button
            variant={selectedCategory === '' ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-8 text-left"
            onClick={() => onCategorySelect('')}
          >
            <div className="w-5 mr-1" />
            <FolderIcon className="h-4 w-4 mr-2" />
            All Documents
          </Button>

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

export function LibraryManager({
  libraries,
  currentLibrary,
  categories,
  selectedCategory,
  onLibrarySelect,
  onCategorySelect,
  onCreateLibrary,
  onRenameLibrary,
  onArchiveLibrary: onArchiveLibrary
}: LibraryManagerProps) {
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(new Set([currentLibrary]));
  const [libraryDocumentCounts, setLibraryDocumentCounts] = useState<Record<string, number>>({});

  // Fetch document counts for all libraries
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const library of libraries) {
        try {
          const response = await fetch(`/api/library?library=${library.name}`);
          const data = await response.json();
          counts[library.name] = data.documents?.length || 0;
        } catch (error) {
          counts[library.name] = 0;
        }
      }
      setLibraryDocumentCounts(counts);
    };

    if (libraries.length > 0) {
      fetchCounts();
    }
  }, [libraries]);

  const handleLibraryToggle = (libraryName: string) => {
    // Switch to the clicked library
    onLibrarySelect(libraryName);

    // Toggle expansion - when expanding, collapse all others
    setExpandedLibraries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(libraryName)) {
        // If already expanded, just collapse it
        newSet.delete(libraryName);
      } else {
        // If not expanded, expand it and collapse all others
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
      <ScrollArea className="h-128">
        <div className="space-y-2">
          {libraries.map((library) => (
            <LibraryNode
              key={library.name}
              library={library}
              isCurrent={library.name === currentLibrary}
              isExpanded={expandedLibraries.has(library.name)}
              categories={library.name === currentLibrary ? categories : []}
              selectedCategory={library.name === currentLibrary ? selectedCategory : ''}
              documentCount={libraryDocumentCounts[library.name] || 0}
              onToggleExpanded={handleLibraryToggle}
              onCategorySelect={onCategorySelect}
              onRenameLibrary={onRenameLibrary}
              onArchiveLibrary={onArchiveLibrary}
            />
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-left text-muted-foreground"
            onClick={onCreateLibrary}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Create New Library
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
