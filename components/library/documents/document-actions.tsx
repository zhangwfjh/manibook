import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HeartIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentActionsProps {
  document: LibraryDocument;
  onOpen?: (document: LibraryDocument) => void;
  onFavoriteToggle?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
}

export function DocumentActions({
  document,
  onOpen,
  onFavoriteToggle,
  onDelete,
}: DocumentActionsProps) {
  const { metadata } = document;

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen?.(document);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(document);
  };

  return (
    <>
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
        onClick={handleFavoriteClick}
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;
              {metadata.title || "this document"}&rdquo;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(document);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Badge variant="secondary">{metadata.doctype}</Badge>
    </>
  );
}
