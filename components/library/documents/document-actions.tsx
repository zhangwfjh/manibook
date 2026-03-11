"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { HeartIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { Document } from "@/lib/library";
import { useLibraryOperations } from "@/stores";

interface DocumentActionsProps {
  document: Document;
}

export function DocumentActions({ document }: DocumentActionsProps) {
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeleteClick}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
      <Badge variant="secondary">{metadata.doctype}</Badge>

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
