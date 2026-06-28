"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Document, Metadata, getFormatIcon } from "@/lib/library";
import { useCoverStore } from "@/stores";
import { invoke } from "@tauri-apps/api/core";
import {
  MetadataForm,
  AbstractSection,
  ExtraMetadata,
  FileInfo,
} from "./detail-sections";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrashIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  BookOpenIcon,
  RefreshCwIcon,
  UsersIcon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  BuildingIcon,
  LoaderIcon,
} from "lucide-react";

interface DocumentDetailDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onUpdate?: (updatedDoc: Document) => void;
}

function FactPill({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
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
  const tMeta = useTranslations("detailSections");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Metadata | null>(
    document?.metadata || null,
  );
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const coverUrl = useCoverStore((s) => (document ? s.covers[document.id] : undefined));
  const coverLoading = useCoverStore((s) =>
    document ? !!s.loading[document.id] : false,
  );
  const loadCover = useCoverStore((s) => s.loadCover);

  useEffect(() => {
    if (document) loadCover(document.id);
  }, [document, loadCover]);

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
        `${t("error")}: ${
          error instanceof Error ? error.message : t("failedToGenerateMetadata")
        }`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!document) return null;

  // Live-preview source: edited values while editing, persisted values otherwise.
  const current = isEditing && editedMetadata ? editedMetadata : document.metadata;
  const {
    title,
    authors,
    publication_year,
    publisher,
    page_count,
    language,
    doctype,
    category,
    keywords,
    filetype,
  } = current;

  const FormatIcon = filetype ? getFormatIcon(filetype) : FileTextIcon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-3xl max-w-5xl w-full flex-col gap-0 overflow-hidden p-0">
        {/* Hero — cover + identity, bleeds to the dialog edges */}
        <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-transparent to-transparent px-6 pb-5 pt-6">
          <div className="flex gap-6">
            {/* Cover */}
            <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60 shadow-lg">
              {coverLoading || !coverUrl ? (
                <div className="flex h-full w-full items-center justify-center">
                  {coverLoading ? (
                    <LoaderIcon className="h-5 w-4 animate-spin text-muted-foreground/50" />
                  ) : (
                    <BookOpenIcon className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
              ) : (
                <Image
                  key={coverUrl}
                  src={coverUrl}
                  alt={`${title} cover`}
                  fill
                  className="object-contain"
                  loading="lazy"
                  unoptimized
                />
              )}
            </div>

            {/* Identity */}
            <div className="min-w-0 flex-1 pr-10">
              <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight">
                {title || tMeta("metadataView.untitled")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {authors && authors.length > 0
                  ? authors.join(", ")
                  : tMeta("metadataView.unknown")}
              </DialogDescription>

              {/* Authors */}
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {authors && authors.length > 0
                    ? authors.join(", ")
                    : tMeta("metadataView.unknown")}
                </span>
              </div>

              {/* Badges: doctype + category */}
              {(doctype || category) && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {doctype && (
                    <Badge variant="secondary" className="gap-1">
                      <BookOpenIcon className="h-3 w-3" />
                      {doctype}
                    </Badge>
                  )}
                  {category && (
                    <Badge variant="outline" className="gap-1">
                      <FileTextIcon className="h-3 w-3" />
                      {category}
                    </Badge>
                  )}
                </div>
              )}

              {/* Quick facts */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {publication_year ? (
                  <FactPill icon={CalendarIcon}>{publication_year}</FactPill>
                ) : null}
                {publisher ? (
                  <FactPill icon={BuildingIcon}>
                    <span className="max-w-[12rem] truncate">{publisher}</span>
                  </FactPill>
                ) : null}
                {page_count ? (
                  <FactPill icon={FileTextIcon}>
                    {page_count} {tMeta("metadata.pages").toLowerCase()}
                  </FactPill>
                ) : null}
                {language ? <FactPill icon={GlobeIcon}>{language}</FactPill> : null}
                {filetype ? (
                  <FactPill icon={FormatIcon}>{filetype.toUpperCase()}</FactPill>
                ) : null}
              </div>

              {/* Keywords */}
              {keywords && keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {keywords.map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="font-normal text-muted-foreground"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        {isEditing ? (
          <Tabs key="edit" defaultValue="details" className="min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="details">{t("tabDetails")}</TabsTrigger>
              <TabsTrigger value="abstract">{t("tabAbstract")}</TabsTrigger>
              <TabsTrigger value="metadata">{t("tabMetadata")}</TabsTrigger>
              <TabsTrigger value="fileInfo">{t("tabFileInfo")}</TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="abstract" className="m-0 p-6 pt-4">
                <AbstractSection
                  metadata={current}
                  isEditing={isEditing}
                  editedMetadata={editedMetadata}
                  onChange={setEditedMetadata}
                />
              </TabsContent>
              <TabsContent value="details" className="m-0 p-6 pt-4">
                <MetadataForm
                  editedMetadata={editedMetadata}
                  onChange={setEditedMetadata}
                  validationErrors={validationErrors}
                />
              </TabsContent>
              <TabsContent value="metadata" className="m-0 p-6 pt-4">
                <ExtraMetadata
                  metadata={current}
                  isEditing={isEditing}
                  editedMetadata={editedMetadata}
                  onChange={setEditedMetadata}
                />
              </TabsContent>
              <TabsContent value="fileInfo" className="m-0 p-6 pt-4">
                <FileInfo document={{ ...document, metadata: current }} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <Tabs key="view" defaultValue="abstract" className="min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-6 mt-4 w-fit">
              <TabsTrigger value="abstract">{t("tabAbstract")}</TabsTrigger>
              <TabsTrigger value="metadata">{t("tabMetadata")}</TabsTrigger>
              <TabsTrigger value="fileInfo">{t("tabFileInfo")}</TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent value="abstract" className="m-0 p-6 pt-4">
                <AbstractSection
                  metadata={current}
                  isEditing={false}
                  editedMetadata={editedMetadata}
                  onChange={setEditedMetadata}
                />
              </TabsContent>
              <TabsContent value="metadata" className="m-0 p-6 pt-4">
                <ExtraMetadata
                  metadata={current}
                  isEditing={false}
                  editedMetadata={editedMetadata}
                  onChange={setEditedMetadata}
                />
              </TabsContent>
              <TabsContent value="fileInfo" className="m-0 p-6 pt-4">
                <FileInfo document={{ ...document, metadata: current }} />
              </TabsContent>
            </div>
          </Tabs>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 border-t bg-background/95 px-6 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isEditing}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
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
                    className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
                  />
                  {t("generate")}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <XIcon className="mr-2 h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button onClick={handleSave}>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  {t("save")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  {t("edit")}
                </Button>
                <Button onClick={handleOpen}>
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  {t("open")}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("deleteDocument")}
        description={t("deleteConfirm", { title: title })}
        cancelText={t("cancel")}
        confirmText={t("delete")}
        onConfirm={confirmDelete}
      />
    </Dialog>
  );
}
