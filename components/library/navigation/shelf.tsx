"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  BookOpenIcon,
} from "lucide-react";
import { useLibraryDataStore, useLibraryFilterStore } from "@/stores";
import { useFilterWithReload } from "@/hooks/library";
import type { Category } from "@/lib/library";
import { cn } from "@/lib/utils";

interface CategoryNodeProps {
  category: Category;
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
  const isInSelectedPath = selectedCategory?.startsWith(pathKey) ?? false;
  const hasChildren = category.children.length > 0;
  const hasDocuments = category.documents.length > 0;

  const nodeWidth = level * 12 + 8;

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={() => {
        onToggleExpanded(pathKey);
      }}
    >
      <div className="relative group">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start h-auto py-2 text-left whitespace-nowrap",
              "hover:bg-muted/80 transition-all duration-200",
              "relative overflow-hidden",
              isSelected && "bg-primary/10 hover:bg-primary/15",
              isInSelectedPath && !isSelected && "bg-muted/50",
            )}
            style={{ paddingLeft: `${nodeWidth}px` }}
            onClick={() => {
              onCategorySelect(pathKey);
            }}
          >
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
            )}

            {hasChildren ? (
              <ChevronRightIcon
                className={cn(
                  "h-4 w-4 mr-1.5 shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-90",
                )}
              />
            ) : (
              <div className="w-4 mr-1.5 shrink-0 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              </div>
            )}

            {hasChildren ? (
              isExpanded ? (
                <FolderOpenIcon
                  className={cn(
                    "h-4 w-4 mr-2 shrink-0 transition-colors duration-200",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                />
              ) : (
                <FolderIcon
                  className={cn(
                    "h-4 w-4 mr-2 shrink-0 transition-colors duration-200",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                />
              )
            ) : (
              <BookOpenIcon
                className={cn(
                  "h-4 w-4 mr-2 shrink-0",
                  isSelected ? "text-primary" : "text-muted-foreground/70",
                )}
              />
            )}

            <span
              className={cn(
                "truncate text-sm font-medium",
                isSelected
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
                "transition-colors duration-200",
              )}
            >
              {category.name}
            </span>

            {hasDocuments && (
              <Badge
                variant={isSelected ? "default" : "secondary"}
                className={cn(
                  "ml-auto shrink-0 text-xs font-normal h-5 px-1.5",
                  "transition-all duration-200",
                  isSelected ? "bg-primary text-primary-foreground" : "",
                )}
              >
                {category.documents.length}
              </Badge>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="overflow-hidden">
        <div
          className={cn(
            "relative space-y-0.5",
            "before:absolute before:left-[0.3rem] before:top-0 before:bottom-0 before:w-px",
            "before:bg-border/50",
          )}
        >
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Shelf() {
  const { categories } = useLibraryDataStore();
  const { selectedCategory } = useLibraryFilterStore();
  const { setSelectedCategory } = useFilterWithReload();

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

  const countDocs = (cat: Category): number => {
    let count = cat.documents.length;
    cat.children.forEach((child) => {
      count += countDocs(child);
    });
    return count;
  };
  const totalDocuments = categories.reduce(
    (total, cat) => total + countDocs(cat),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-semibold text-foreground">Shelves</h3>
          {totalDocuments > 0 && (
            <Badge
              variant="secondary"
              className="text-xs font-normal h-5 px-1.5"
            >
              {totalDocuments}
            </Badge>
          )}
        </div>
      </div>

      {categories.length > 0 ? (
        <ScrollArea className="h-96 whitespace-nowrap">
          <div className="space-y-0.5 min-w-0 px-1">
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
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <FolderIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">No shelves yet</p>
          <p className="text-xs text-muted-foreground/70">
            Import documents to organize them into categories
          </p>
        </div>
      )}
    </div>
  );
}
