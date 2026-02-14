"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
import { Document } from "@/lib/library";
import { useLibraryOperations } from "@/stores/library";

interface DocumentActionsProps {
  document: Document;
}

export function DocumentActions({ document }: DocumentActionsProps) {
  const t = useTranslations("features.documentActions");
  const { openDocument, toggleFavorite, deleteDocument } =
    useLibraryOperations();
  const { metadata } = document;

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDocument(document);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(document);
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
        className={`h-6 w-6 p-0 ${metadata.favorite
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
            <AlertDialogTitle>{t("deleteDocument")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm", { title: metadata.title || t("thisDocument") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.stopPropagation();
                deleteDocument(document);
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Badge variant="secondary">{metadata.doctype}</Badge>
    </>
  );
}
