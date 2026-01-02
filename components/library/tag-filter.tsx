import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import { LibraryDocument } from '@/lib/library';

interface TagFilterProps {
  documents: LibraryDocument[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ documents, selectedTags, onTagsChange }: TagFilterProps) {
  const availableTags = useMemo(() => {
    // Extract all unique keywords from documents
    const tagSet = new Set<string>();
    documents.forEach(doc => {
      if (doc.metadata.keywords) {
        doc.metadata.keywords.forEach(keyword => {
          if (keyword && keyword.trim()) {
            tagSet.add(keyword.trim());
          }
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Tags
        </h3>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllTags}
            className="h-6 px-2 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Active filters:</p>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="default"
                className="text-xs cursor-pointer hover:bg-primary/80"
                onClick={() => handleTagRemove(tag)}
              >
                {tag}
                <XIcon className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Available Tags */}
      <ScrollArea className="h-96">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Click to filter:</p>
          <div className="flex flex-wrap gap-1">
            {availableTags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              const count = documents.filter(doc =>
                doc.metadata.keywords?.includes(tag)
              ).length;

              return (
                <Badge
                  key={tag}
                  variant={isSelected ? "default" : "outline"}
                  className={`text-xs cursor-pointer hover:bg-primary/80 ${
                    isSelected ? '' : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                </Badge>
              );
            })}
          </div>
          {availableTags.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No tags available
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
