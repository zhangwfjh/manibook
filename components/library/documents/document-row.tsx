"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { formatFileSize } from "@/lib/library";
import { Metadata } from "./metadata";
import { DocumentRowProps } from "../types";
import { useLibraryContext } from "@/contexts/LibraryContext";

export function DocumentRow({ document, style }: DocumentRowProps) {
  const {
    handleOpen,
    handleFavoriteToggle,
    handleDocumentDelete,
    handleDocumentClick,
    handleToggleDocumentSelection,
    selectionMode,
    selectedDocuments,
  } = useLibraryContext();

  const selected = selectedDocuments?.has(document.id) ?? false;

  const handleClick = () => {
    if (selectionMode) {
      handleToggleDocumentSelection(document.id);
    } else {
      handleDocumentClick(document);
    }
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpen(document);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFavoriteToggle(document);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleDocumentDelete(document);
  };

  const { metadata } = document;

  return (
    <div
      className={`flex items-center border-b px-4 py-2 hover:bg-muted/50 cursor-pointer ${
        selected ? "bg-muted" : ""
      }`}
      style={style}
      onClick={handleClick}
    >
      <div className="flex-1 min-w-0">
        <Metadata metadata={metadata} compact />
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
      {!selectionMode && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenClick}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
