import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface FormatFilterProps {
  documents: LibraryDocument[];
  selectedFormats: string[];
  onFormatsChange: (formats: string[]) => void;
}

export function FormatFilter({
  documents,
  selectedFormats,
  onFormatsChange,
}: FormatFilterProps) {
  const [formatSearch, setFormatSearch] = useState("");

  const availableFormats = useMemo(() => {
    // Extract all unique formats from documents
    const formatSet = new Set<string>();
    documents.forEach((doc) => {
      if (doc.metadata.format && doc.metadata.format.trim()) {
        formatSet.add(doc.metadata.format.toUpperCase());
      }
    });
    return Array.from(formatSet).sort();
  }, [documents]);

  const filteredFormats = useMemo(() => {
    return availableFormats.filter((format) =>
      format.toLowerCase().includes(formatSearch.toLowerCase())
    );
  }, [availableFormats, formatSearch]);

  const handleFormatToggle = (format: string) => {
    if (selectedFormats.includes(format)) {
      onFormatsChange(selectedFormats.filter((f) => f !== format));
    } else {
      onFormatsChange([...selectedFormats, format]);
    }
  };

  const handleFormatRemove = (formatToRemove: string) => {
    onFormatsChange(selectedFormats.filter((format) => format !== formatToRemove));
  };

  const clearAllFormats = () => {
    onFormatsChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Formats
        </h3>
        {selectedFormats.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFormats}
            className="h-6 px-2 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Selected Formats */}
      {selectedFormats.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Active filters:</p>
          <div className="flex flex-wrap gap-1">
            {selectedFormats.map((format) => (
              <Badge
                key={format}
                variant="default"
                className="text-xs cursor-pointer hover:bg-primary/80"
                onClick={() => handleFormatRemove(format)}
              >
                {format}
                <XIcon className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Available Formats */}
      <ScrollArea className="h-32">
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
            <Input
              placeholder="Search formats..."
              value={formatSearch}
              onChange={(e) => setFormatSearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">Click to filter:</p>
          <div className="flex flex-wrap gap-1">
            {filteredFormats.map((format) => {
              const isSelected = selectedFormats.includes(format);
              const count = documents.filter((doc) =>
                doc.metadata.format?.toUpperCase() === format
              ).length;

              return (
                <Badge
                  key={format}
                  variant={isSelected ? "default" : "outline"}
                  className={`text-xs cursor-pointer hover:bg-primary/80 ${
                    isSelected ? "" : "hover:border-primary/50"
                  }`}
                  onClick={() => handleFormatToggle(format)}
                >
                  {format}
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                </Badge>
              );
            })}
          </div>
          {filteredFormats.length === 0 && availableFormats.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              No formats match your search
            </p>
          )}
          {availableFormats.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No formats available
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
