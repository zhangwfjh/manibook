import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon, ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GenericFilterProps {
  title: string;
  selectedItems?: string[];
  onItemsChange: (items: string[]) => void;
  filterOptions: Record<string, number>;
}

export function Filter({
  title,
  selectedItems = [],
  onItemsChange,
  filterOptions = {},
}: GenericFilterProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [itemSearch, setItemSearch] = useState("");

  const availableItems = useMemo(() => {
    return Object.keys(filterOptions || {}).sort();
  }, [filterOptions]);

  const getItemCount = useCallback(
    (item: string): number => {
      return (filterOptions || {})[item] || 0;
    },
    [filterOptions]
  );

  const filteredItems = useMemo(() => {
    const searchLower = itemSearch.toLowerCase();
    return availableItems.filter((item) =>
      item.toLowerCase().includes(searchLower)
    );
  }, [availableItems, itemSearch]);

  const handleItemToggle = (item: string) => {
    if (selectedItems.includes(item)) {
      onItemsChange(selectedItems.filter((i) => i !== item));
    } else {
      onItemsChange([...selectedItems, item]);
    }
  };

  const handleItemRemove = (itemToRemove: string) => {
    onItemsChange(selectedItems.filter((item) => item !== itemToRemove));
  };

  const clearAllItems = () => {
    onItemsChange([]);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded">
          <div className="flex items-center gap-2">
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
              {selectedItems.length > 0 && (
                <span className="ml-2 text-xs text-primary">
                  ({selectedItems.length})
                </span>
              )}
            </h3>
          </div>
          {selectedItems.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearAllItems();
              }}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3">
        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Active filters:</p>
            <div className="flex flex-wrap gap-1">
              {selectedItems.map((item) => (
                <Badge
                  key={item}
                  variant="default"
                  className="text-xs cursor-pointer hover:bg-primary/80"
                  onClick={() => handleItemRemove(item)}
                >
                  {item}
                  <XIcon className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Items */}
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to filter:</p>
            <div className="flex flex-wrap gap-1 max-h-52 overflow-y-auto">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.includes(item);
                const count = getItemCount(item);

                return (
                  <Badge
                    key={item}
                    variant={isSelected ? "default" : "outline"}
                    className={`text-xs cursor-pointer hover:bg-primary/80 ${
                      isSelected ? "" : "hover:border-primary/50"
                    }`}
                    onClick={() => handleItemToggle(item)}
                  >
                    {item}
                    <span className="ml-1 text-xs opacity-70">({count})</span>
                  </Badge>
                );
              })}
            </div>
            {filteredItems.length === 0 && availableItems.length > 0 && (
              <p className="text-xs text-muted-foreground italic">
                No {title.toLowerCase()} match your search
              </p>
            )}
            {availableItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No {title.toLowerCase()} available
              </p>
            )}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}
