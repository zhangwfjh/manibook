"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { HeartIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { Document } from "@/lib/library";
import { useLibraryOperations } from "@/stores";

interface DocumentActionsProps {
  document: Document;
  showFavorite?: boolean;
  showDelete?: boolean;
}

export function DocumentActions({
  document,
  showFavorite = true,
  showDelete = true,
}: DocumentActionsProps) {
  const t = useTranslations("features.documentActions");
  const { openDocument, toggleFavorite, deleteDocument } =
    useLibraryOperations();
  const { metadata } = document;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDocument(document);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(document);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteDocument(document);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenClick}
        aria-label={t("openLabel")}
        title={t("openLabel")}
        className="h-6 w-6 p-0"
      >
        <BookOpenIcon className="h-4 w-4" />
      </Button>
      {showFavorite && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFavoriteClick}
          aria-label={t("favoriteLabel")}
          title={t("favoriteLabel")}
          aria-pressed={metadata.favorite}
          className={
            metadata.favorite
              ? "h-6 w-6 p-0 text-primary"
              : "h-6 w-6 p-0 text-muted-foreground hover:text-primary"
          }
        >
          <HeartIcon
            className={`h-4 w-4 ${metadata.favorite ? "fill-current" : ""}`}
          />
        </Button>
      )}
      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteClick}
          aria-label={t("deleteLabel")}
          title={t("deleteLabel")}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("deleteDocument")}
        description={t("deleteConfirm", {
          title: metadata.title || t("thisDocument"),
        })}
        cancelText={t("cancel")}
        confirmText={t("delete")}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
