"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CopyIcon, TrashIcon, ExternalLinkIcon } from "lucide-react";
import type { Document } from "@/lib/library";
import { formatFileSize } from "@/lib/library";
import { useLibraryOpsStore, useLibraryOperations, useLibraryUIStore } from "@/stores";

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicatesDialog({ open, onOpenChange }: DuplicatesDialogProps) {
  const t = useTranslations("duplicates");
  const findDuplicates = useLibraryOpsStore((s) => s.findDuplicates);
  const deleteDocument = useLibraryOperations((s) => s.deleteDocument);
  const openDocument = useLibraryOperations((s) => s.openDocument);
  const { openDocumentDialog } = useLibraryUIStore();

  const [groups, setGroups] = useState<Document[][]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null);
  const runScan = useCallback(async () => {
    setLoading(true);
    setLoaded(false);
    setSelected(new Set());
    try {
      const result = await findDuplicates();
      setGroups(result ?? []);
      // Auto-select all except the first in each group
      const autoSelected = new Set<string>();
      for (const group of result ?? []) {
        for (let i = 1; i < group.length; i++) {
          autoSelected.add(group[i].id);
        }
      }
      setSelected(autoSelected);
    } catch (error) {
      console.error("Error finding duplicates:", error);
      setGroups([]);
      setSelected(new Set());
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [findDuplicates]);

  useEffect(() => {
    if (open) {
      void runScan();
    } else {
      // Reset transient state when the dialog closes.
      setGroups([]);
      setSelected(new Set());
      setLoaded(false);
      setPendingDelete(null);
    }
  }, [open, runScan]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allDocIds = groups.flat().map((d) => d.id);

  const selectAll = () => setSelected(new Set(allDocIds));
  const invertSelection = () =>
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of allDocIds) {
        if (!prev.has(id)) next.add(id);
      }
      return next;
    });
  const clearSelection = () => setSelected(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    setPendingBulkDelete(false);
    // Optimistically remove selected docs from local state
    setGroups((prev) =>
      prev
        .map((g) => g.filter((d) => !selected.has(d.id)))
        .filter((g) => g.length > 1),
    );
    setSelected(new Set());
    // Fire deletes sequentially
    for (const id of ids) {
      const doc = groups.flat().find((d) => d.id === id);
      if (doc) {
        try {
          await deleteDocument(doc);
        } catch (error) {
          console.error("Error deleting duplicate:", error);
        }
      }
    }
  };
  const handleDeleteConfirm = async () => {
    const doc = pendingDelete;
    if (!doc) return;
    setPendingDelete(null);
    // Optimistically remove the document from local state, then fire the
    // real delete. Empty groups are dropped so the UI stays tidy.
    setGroups((prev) =>
      prev
        .map((g) => g.filter((d) => d.id !== doc.id))
        .filter((g) => g.length > 1),
    );
    setSelected((prev) => {
      if (!prev.has(doc.id)) return prev;
      const next = new Set(prev);
      next.delete(doc.id);
      return next;
    });
    try {
      await deleteDocument(doc);
    } catch (error) {
      console.error("Error deleting duplicate:", error);
    }
  };

  const hasGroups = loaded && groups.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CopyIcon className="size-4 text-muted-foreground" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("title")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-5" />
              <span>{t("scanning")}</span>
            </div>
          ) : !hasGroups ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              {t("noDuplicates")}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map((group, gi) => {
                const title = group[0]?.metadata.title?.trim() || "Untitled";
                return (
                  <div key={`${title}-${gi}`} className="rounded-lg border bg-card/50">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-sm font-medium" title={title}>
                        {title}
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {t("groupCount", { count: group.length })}
                      </Badge>
                    </div>
                    <Separator />
                    <ul className="flex flex-col">
                      {group.map((doc) => (
                        <DuplicateRow
                          key={doc.id}
                          document={doc}
                          checked={selected.has(doc.id)}
                          onToggle={() => toggleSelected(doc.id)}
                          onClick={() => openDocumentDialog(doc)}
                          onOpen={() => openDocument(doc)}
                          onDelete={() => setPendingDelete(doc)}
                          deleteLabel={t("delete")}
                          openLabel={t("open")}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasGroups && (
          <div className="flex items-center gap-1.5 border-t px-4 py-2 text-xs">
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2 text-xs">
              {t("selectAll")}
            </Button>
            <Button variant="ghost" size="sm" onClick={invertSelection} className="h-7 px-2 text-xs">
              {t("invert")}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs">
              {t("clearSelection")}
            </Button>
            {selected.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingBulkDelete(true)}
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              >
                <TrashIcon className="mr-1 size-3" />
                {t("deleteSelected")}
              </Button>
            )}
            <span className="ml-auto text-muted-foreground tabular-nums">
              {selected.size} / {allDocIds.length}
            </span>
          </div>
        )}

      </DialogContent>

      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={t("delete")}
        description={t("deleteConfirm")}
        cancelText={t("close")}
        confirmText={t("delete")}
        confirmIcon={<TrashIcon className="size-4" />}
        onConfirm={() => void handleDeleteConfirm()}
      />


      <ConfirmationDialog
        open={pendingBulkDelete}
        onOpenChange={setPendingBulkDelete}
        title={t("deleteSelected")}
        description={t("bulkDeleteConfirm", { count: selected.size })}
        cancelText={t("close")}
        confirmText={t("delete")}
        confirmIcon={<TrashIcon className="size-4" />}
        onConfirm={() => void handleBulkDelete()}
      />
    </Dialog>
  );
}

interface DuplicateRowProps {
  document: Document;
  checked: boolean;
  onToggle: () => void;
  onClick: () => void;
  onOpen: () => void;
  onDelete: () => void;
  deleteLabel: string;
  openLabel: string;
}

function DuplicateRow({
  document,
  checked,
  onToggle,
  onClick,
  onOpen,
  onDelete,
  deleteLabel,
  openLabel,
}: DuplicateRowProps) {
  const { metadata, url } = document;
  const year = metadata.publication_year;
  const authors =
    metadata.authors && metadata.authors.length > 0
      ? metadata.authors.join(", ")
      : null;

  return (
    <li className="flex items-center gap-2 px-3 py-1.5">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        aria-label="select duplicate"
        className="size-4 shrink-0"
      />
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={onClick}
        title="Click to view details"
      >
        <p className="truncate text-xs font-medium leading-tight hover:underline" title={metadata.title}>
          {metadata.title || "Untitled"}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {[
            authors,
            year ? String(year) : null,
            metadata.filetype?.toUpperCase(),
            metadata.filesize ? formatFileSize(metadata.filesize) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="truncate text-[10px] leading-tight text-muted-foreground/70" title={url}>
          {url}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          aria-label={openLabel}
          title={openLabel}
          className="size-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="size-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}
