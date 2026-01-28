import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
} from "lucide-react";
import { LibraryCategory } from "@/lib/library";
import { useLibraryContext } from "@/contexts/LibraryContext";

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

export function Shelf() {
  const {
    currentLibrary,
    categories,
    selectedCategory,
    setSelectedCategory,
  } = useLibraryContext();

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

  if (!currentLibrary) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Shelves
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Shelves
      </h3>
      <ScrollArea className="h-96">
        <div className="space-y-1">
          {categories.map((category, index) => (
            <CategoryNode
              key={index}
              category={category}
              level={0}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              expandedNodes={expandedNodes}
              onToggleExpanded={handleToggleExpanded}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
