import React, { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartIcon, BookOpenIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";
import { formatFileSize } from "@/lib/library/document-utils";

interface DocumentRowProps {
  document: LibraryDocument;
  onClick: (document: LibraryDocument) => void;
  onOpen: (document: LibraryDocument) => void;
  onFavoriteToggle: (document: LibraryDocument) => void;
  style?: React.CSSProperties;
}

function DocumentRowComponent({
  document,
  onClick,
  onOpen,
  onFavoriteToggle,
  style,
}: DocumentRowProps) {
  const handleClick = useCallback(() => {
    onClick(document);
  }, [document, onClick]);

  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpen(document);
    },
    [document, onOpen]
  );

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavoriteToggle(document);
    },
    [document, onFavoriteToggle]
  );

  const { metadata } = document;

  return (
    <div
      className="flex items-center border-b px-4 py-2 hover:bg-muted/50 cursor-pointer"
      style={style}
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium max-w-xs truncate" title={metadata.title}>
          {metadata.title}
        </div>
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {metadata.authors?.join(", ") || "-"}
        </div>
      </div>
      <div className="w-20 text-sm text-muted-foreground shrink-0">
        {metadata.publicationYear || "-"}
      </div>
      <div className="w-24 shrink-0">
        <Badge variant="secondary" className="text-xs">
          {metadata.doctype}
        </Badge>
      </div>
      <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate max-w-xs">
        {metadata.publisher || "-"}
      </div>
      <div className="w-20 text-sm text-muted-foreground shrink-0">
        {metadata.language || "-"}
      </div>
      <div className="w-16 text-sm text-muted-foreground shrink-0">
        {metadata.numPages || "-"}
      </div>
      <div className="w-16 text-sm text-muted-foreground shrink-0">
        {metadata.format?.toUpperCase() || "-"}
      </div>
      <div className="w-20 text-sm text-muted-foreground shrink-0">
        {metadata.filesize ? formatFileSize(metadata.filesize) : "-"}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpen}
          className="h-6 w-6 p-0"
        >
          <BookOpenIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFavorite}
          className={`h-6 w-6 p-0 ${
            metadata.favorite
              ? "text-red-500"
              : "text-muted-foreground hover:text-red-500"
          }`}
        >
          <HeartIcon
            className={`h-4 w-4 ${metadata.favorite ? "fill-current" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}

export const DocumentRow = memo(DocumentRowComponent);
DocumentRow.displayName = "DocumentRow";
