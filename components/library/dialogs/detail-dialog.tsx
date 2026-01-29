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
import { LibraryDocument, DocumentMetadata } from "@/lib/library";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MetadataForm,
  MetadataView,
  AbstractSection,
  ExtraMetadata,
  FileInfo,
} from "./detail-sections";
import { ActionsSection } from "./actions-section";

interface DocumentDetailDialogProps {
  document: LibraryDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
  onUpdate?: (updatedDoc: LibraryDocument) => void;
}

export function DocumentDetailDialog({
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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setIsEditing(false);
    }
  }, [onOpenChange]);

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
    handleOpenChange(false);
    setIsDeleteDialogOpen(false);
  }, [document, onDelete, handleOpenChange]);

  const handleGenerateMetadata = useCallback(async () => {
    if (!document) return;

    setIsGenerating(true);
    try {
      const metadata = await invoke<DocumentMetadata>("generate_metadata", {
        documentId: document.id
      });

      if (metadata) {
        setEditedMetadata({
          doctype: metadata.doctype,
          title: metadata.title,
          authors: metadata.authors,
          publicationYear: metadata.publicationYear,
          publisher: metadata.publisher,
          category: metadata.category,
          language: metadata.language,
          keywords: metadata.keywords,
          abstract: metadata.abstract,
          favorite: metadata.favorite,
          numPages: metadata.numPages,
          filesize: metadata.filesize,
          format: metadata.format,
          metadata: metadata.metadata,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error generating metadata:", error);
      alert(
        `Error: ${
          error instanceof Error ? error.message : "Failed to generate metadata"
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [document]);

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

         <ActionsSection
           isEditing={isEditing}
           isGenerating={isGenerating}
           onEdit={handleEdit}
           onCancel={handleCancel}
           onSave={handleSave}
           onDelete={handleDelete}
           onOpen={handleOpen}
           onGenerateMetadata={handleGenerateMetadata}
         />
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
