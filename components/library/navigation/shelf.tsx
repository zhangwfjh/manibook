"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useTranslations } from "next-intl";

interface CategoryNodeProps {
  category: Category;
  level: number;
  selectedCategory: string;
  onCategorySelect: (categoryPath: string) => void;
  expandedNodes: Set<string>;
  onToggleExpanded: (path: string) => void;
  delayIndex?: number;
}

function CategoryNode({
  category,
  level,
  selectedCategory,
  onCategorySelect,
  expandedNodes,
  onToggleExpanded,
  delayIndex,
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
      className={cn(level === 0 && delayIndex != null && "rr-rise")}
      style={
        level === 0 && delayIndex != null
          ? { animationDelay: `${delayIndex * 60}ms` }
          : undefined
      }
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
  const t = useTranslations("navigation");

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

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="relative mb-3">
          <div className="absolute inset-0 -m-2 rr-glow rounded-full opacity-60" />
          <div className="relative w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center ring-1 ring-border/60">
            <FolderIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <p className="text-sm font-medium text-foreground/80 mb-1">
          {t("noShelvesYet")}
        </p>
        <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-[16rem]">
          {t("importDocumentsHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 min-w-0">
      {categories.map((category, index) => (
        <CategoryNode
          key={index}
          category={category}
          level={0}
          delayIndex={index}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          expandedNodes={expandedNodes}
          onToggleExpanded={handleToggleExpanded}
        />
      ))}
    </div>
  );
}
