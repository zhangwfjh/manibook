"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Document, Metadata } from "@/lib/library";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MetadataForm,
  MetadataView,
  AbstractSection,
  ExtraMetadata,
  FileInfo,
} from "./detail-sections";
import { Button } from "@/components/ui/button";
import {
  TrashIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  BookOpenIcon,
  RefreshCwIcon,
} from "lucide-react";

interface DocumentDetailDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onUpdate?: (updatedDoc: Document) => void;
}

export function DocumentDetailDialog({
  document,
  open,
  onOpenChange,
  onOpen,
  onDelete,
  onUpdate,
}: DocumentDetailDialogProps) {
  const t = useTranslations("dialogs.detail");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Metadata | null>(
    document?.metadata || null,
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setIsEditing(false);
    }
  };

  const handleOpen = () => {
    onOpen?.(document!);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedMetadata(document?.metadata || null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedMetadata(document?.metadata || null);
  };

  const handleSave = async () => {
    if (!editedMetadata || !document) return;

    const errors: Record<string, string> = {};
    if (!editedMetadata.title?.trim()) {
      errors.title = t("titleRequired");
    }
    if (!editedMetadata.doctype) {
      errors.doctype = t("doctypeRequired");
    }
    if (!editedMetadata.category?.split(" > ")[0]?.trim()) {
      errors.category = t("categoryRequired");
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    const metadataToSave = { ...editedMetadata };
    if (
      !metadataToSave.authors ||
      metadataToSave.authors.length === 0 ||
      metadataToSave.authors.every((author: string) => !author.trim())
    ) {
      metadataToSave.authors = [t("unknownAuthor")];
    }

    const updatedDocument: Document = {
      ...document,
      metadata: metadataToSave,
    };

    try {
      onUpdate?.(updatedDocument);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating document:", error);
      alert(t("errorUpdatingDocument"));
    }
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete?.(document!);
    handleOpenChange(false);
    setIsDeleteDialogOpen(false);
  };

  const handleGenerateMetadata = async () => {
    if (!document) return;

    setIsGenerating(true);
    try {
      const metadata = await invoke<Metadata>("generate_metadata", {
        documentId: document.id,
      });

      if (metadata) {
        setEditedMetadata({
          doctype: metadata.doctype,
          title: metadata.title,
          authors: metadata.authors,
          publication_year: metadata.publication_year,
          publisher: metadata.publisher,
          category: metadata.category,
          language: metadata.language,
          keywords: metadata.keywords,
          abstract: metadata.abstract,
          favorite: metadata.favorite,
          page_count: metadata.page_count,
          filesize: metadata.filesize,
          filetype: metadata.filetype,
          metadata: metadata.metadata,
        });
      }
    } catch (error) {
      console.error("Error generating metadata:", error);
      alert(
        `${t("error")}: ${error instanceof Error ? error.message : t("failedToGenerateMetadata")
        }`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!document) return null;

  const { metadata } = document;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl w-full min-w-3xl max-h-[90vh]">
        <DialogTitle className="text-xl font-semibold">
          {metadata.title}
        </DialogTitle>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {isEditing ? (
              <MetadataForm
                editedMetadata={editedMetadata}
                onChange={setEditedMetadata}
                validationErrors={validationErrors}
              />
            ) : (
              <MetadataView metadata={metadata} />
            )}

            <AbstractSection
              metadata={metadata}
              isEditing={isEditing}
              editedMetadata={editedMetadata}
              onChange={setEditedMetadata}
            />

            <ExtraMetadata
              metadata={metadata}
              isEditing={isEditing}
              editedMetadata={editedMetadata}
              onChange={setEditedMetadata}
            />

            <FileInfo document={document} />
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isEditing}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t("delete")}
          </Button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerateMetadata}
                  disabled={isGenerating}
                >
                  <RefreshCwIcon
                    className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`}
                  />
                  {t("generate")}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <XIcon className="h-4 w-4 mr-2" />
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {t("save")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <EditIcon className="h-4 w-4 mr-2" />
                  {t("edit")}
                </Button>
                <Button onClick={handleOpen}>
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  {t("open")}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDocument")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm", { title: metadata.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
