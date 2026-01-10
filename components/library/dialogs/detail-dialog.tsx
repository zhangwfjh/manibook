import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import {
  TrashIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  BookOpenIcon,
} from "lucide-react";
import { LibraryDocument, DocumentMetadata } from "@/lib/library";
import React, { useState, useMemo, useCallback } from "react";
import {
  MetadataForm,
  MetadataView,
  AbstractSection,
  ExtraMetadata,
  FileInfo,
} from "./detail-sections";
import { getCoverUrl } from "@/lib/library/document-utils";

interface DocumentDetailDialogProps {
  library: string;
  document: LibraryDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
  onUpdate?: (updatedDoc: LibraryDocument) => void;
}

export function DocumentDetailDialog({
  library,
  document,
  open,
  onOpenChange,
  onOpen,
  onDelete,
  onUpdate,
}: DocumentDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<DocumentMetadata | null>(
    document?.metadata || null
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const coverUrl = useMemo(
    () => (document ? getCoverUrl(library, document) : ""),
    [library, document]
  );

  const handleOpen = useCallback(() => {
    onOpen?.(document!);
  }, [document, onOpen]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditedMetadata(document?.metadata || null);
  }, [document?.metadata]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedMetadata(document?.metadata || null);
  }, [document?.metadata]);

  const handleSave = useCallback(async () => {
    if (!editedMetadata || !document) return;

    const errors: Record<string, string> = {};
    if (!editedMetadata.title?.trim()) {
      errors.title = "Title is required";
    }
    if (!editedMetadata.doctype) {
      errors.doctype = "Document type is required";
    }
    if (!editedMetadata.category?.split(" > ")[0]?.trim()) {
      errors.category = "Category is required";
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
      metadataToSave.authors = ["Unknown Author"];
    }

    const updatedDocument: LibraryDocument = {
      ...document,
      metadata: metadataToSave,
    };

    try {
      onUpdate?.(updatedDocument);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Error updating document");
    }
  }, [editedMetadata, document, onUpdate]);

  const handleDelete = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    onDelete?.(document!);
    onOpenChange(false);
    setIsDeleteDialogOpen(false);
  }, [document, onDelete, onOpenChange]);

  if (!document) return null;

  const { metadata } = document;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full min-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Image
                src={coverUrl}
                alt={`${metadata.title} cover`}
                width={150}
                height={200}
                className="w-24 h-32 object-cover rounded-lg border shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                {metadata.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <div className="max-w-full">
              <div className="pt-6">
                <Label className="text-sm font-medium text-muted-foreground mb-4 block">
                  BASIC INFORMATION
                </Label>
                {isEditing ? (
                  <MetadataForm
                    editedMetadata={editedMetadata}
                    onChange={setEditedMetadata}
                    validationErrors={validationErrors}
                  />
                ) : (
                  <MetadataView metadata={metadata} />
                )}
              </div>
            </div>

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
            Delete
          </Button>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <XIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <EditIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button onClick={handleOpen}>
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                  Open
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
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{metadata.title}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
