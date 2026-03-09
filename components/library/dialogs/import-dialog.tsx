"use client";

import React, { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputGroup, InputGroupButton } from "@/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UploadIcon,
  LinkIcon,
  XIcon,
  PlusIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useImportStore, ImportBatch } from "@/stores/importStore";
import { ImportDrawer } from "@/components/ui/import-drawer";
import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

function showImportCompleteToast(
  batch: ImportBatch,
  itemType: "file" | "document",
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const successCount = batch.items.filter(
    (item) => item.status === "success",
  ).length;
  const failedCount = batch.items.filter(
    (item) => item.status === "failed",
  ).length;
  const canceledCount = batch.items.filter(
    (item) => item.status === "canceled",
  ).length;

  const itemTypeKey = itemType === "file" ? "file" : "document";
  const itemLabel =
    successCount !== 1 || failedCount !== 1
      ? t(`itemTypes.${itemTypeKey}.plural`)
      : t(`itemTypes.${itemTypeKey}.singular`);

  if (canceledCount > 0) {
    if (successCount === 0 && failedCount === 0) {
      toast.info(
        t("toast.canceledAll", { count: canceledCount, itemType: itemLabel }),
      );
    } else if (failedCount === 0) {
      toast.info(
        t("toast.importedAndCanceled", {
          successCount,
          canceledCount,
          itemType: itemLabel,
        }),
      );
    } else {
      toast.warning(
        t("toast.importedFailedCanceled", {
          successCount,
          failedCount,
          canceledCount,
        }),
      );
    }
  } else if (failedCount === 0) {
    toast.success(
      t("toast.success", { count: successCount, itemType: itemLabel }),
    );
  } else if (successCount === 0) {
    toast.error(
      t("toast.allFailed", { count: failedCount, itemType: itemLabel }),
    );
  } else {
    toast.warning(t("toast.partialFailure", { successCount, failedCount }));
  }
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportDialogProps) {
  const t = useTranslations("dialogs.import");
  const [activeTab, setActiveTab] = useState("files");
  const [importing, setImporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { addBatch, updateItemStatus, clearBatch, currentBatch } =
    useImportStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const [urls, setUrls] = useState<string[]>([""]);
  const [urlErrors, setUrlErrors] = useState<string[]>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedExtensions = ["pdf", "djvu", "epub"];
    const filteredFiles = Array.from(files).filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return allowedExtensions.includes(extension || "");
    });

    if (filteredFiles.length === 0) {
      toast.error(t("invalidFilesError"));
      return;
    }

    clearBatch();

    const importItems = filteredFiles.map((file) => ({
      filename: file.name,
      status: "importing" as const,
      abortController: new AbortController(),
    }));

    const batchId = addBatch(importItems);
    setDrawerOpen(true);
    setImporting(true);

    for (let i = 0; i < filteredFiles.length; i++) {
      const file = filteredFiles[i];
      const itemId = `${batchId}-item-${i}`;

      const currentStatus =
        useImportStore.getState().currentBatch?.items[i]?.status;
      if (currentStatus === "canceled") {
        continue;
      }

      let fileData: { filename: string; data: number[] };
      try {
        const buffer = await file.arrayBuffer();
        fileData = {
          filename: file.name,
          data: Array.from(new Uint8Array(buffer)),
        };
      } catch {
        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status !== "canceled") {
          updateItemStatus(itemId, "failed", {
            error: t("failedToReadFiles"),
          });
        }
        continue;
      }

      try {
        const result = await invoke<{
          results: Array<{
            success: boolean;
            filename?: string;
            error?: string;
          }>;
          errors: Array<{
            source: string;
            error: string;
          }>;
        }>("import_documents", {
          request: {
            file_data: [fileData],
          },
        });

        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status === "canceled") {
          continue;
        }

        const fileResult = result.results[0];
        if (fileResult?.success) {
          updateItemStatus(itemId, "success", {
            completedAt: new Date(),
          });
        } else {
          const errorMsg = fileResult?.error || t("importFailed");
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(itemId, "success", {
              completedAt: new Date(),
            });
          } else {
            updateItemStatus(itemId, "failed", { error: errorMsg });
          }
        }
      } catch (error) {
        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status !== "canceled") {
          updateItemStatus(itemId, "failed", {
            error: error instanceof Error ? error.message : t("importFailed"),
          });
        }
      }
    }

    setImporting(false);
    onImportComplete();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }

    const batch = useImportStore.getState().currentBatch;
    if (batch) {
      showImportCompleteToast(batch, "file", t);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileImport({
        target: { files: e.dataTransfer.files },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const addUrl = () => {
    setUrls([...urls, ""]);
    setUrlErrors([...urlErrors, ""]);
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    const newErrors = urlErrors.filter((_, i) => i !== index);
    setUrls(newUrls.length > 0 ? newUrls : [""]);
    setUrlErrors(newErrors.length > 0 ? newErrors : [""]);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);

    const newErrors = [...urlErrors];
    if (newErrors[index]) {
      newErrors[index] = "";
      setUrlErrors(newErrors);
    }
  };

  const validateUrl = (url: string): string => {
    if (!url.trim()) return "";
    try {
      new URL(url);
      return "";
    } catch {
      return t("invalidUrlFormat");
    }
  };

  const handleUrlImport = async () => {
    const validUrls = urls.filter((url) => url.trim());
    if (validUrls.length === 0) {
      toast.error(t("enterAtLeastOneUrl"));
      return;
    }

    const newErrors = urls.map((url) => validateUrl(url));
    setUrlErrors(newErrors);

    if (newErrors.some((error) => error)) {
      toast.error(t("fixUrlErrors"));
      return;
    }

    clearBatch();

    const importItems = validUrls.map((url) => ({
      filename: url.split("/").pop() || t("unknown"),
      status: "importing" as const,
      path: url,
      abortController: new AbortController(),
    }));

    const batchId = addBatch(importItems);
    setDrawerOpen(true);
    setImporting(true);

    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      const itemId = `${batchId}-item-${i}`;

      const currentStatus =
        useImportStore.getState().currentBatch?.items[i]?.status;
      if (currentStatus === "canceled") {
        continue;
      }

      let fileData: { filename: string; data: number[] };
      try {
        const response = await tauriFetch(url, { method: "GET" });
        const status = (response as unknown as { status: number }).status;
        if (status < 200 || status >= 300) {
          throw new Error(`HTTP ${status}`);
        }

        const allowedExtensions = ["pdf", "djvu", "epub"];
        let extension = url.split(".").pop()?.toLowerCase() || "";

        if (!allowedExtensions.includes(extension)) {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("pdf")) extension = "pdf";
          else if (contentType.includes("epub")) extension = "epub";
          else if (contentType.includes("djvu")) extension = "djvu";
          else throw new Error("Unable to determine file type");
        }

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();
        const filename = url.split("/").pop() || `document.${extension}`;

        fileData = {
          filename,
          data: Array.from(new Uint8Array(buffer)),
        };
      } catch (error) {
        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status !== "canceled") {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          updateItemStatus(itemId, "failed", { error: errorMessage });
        }
        continue;
      }

      try {
        const result = await invoke<{
          results: Array<{
            success: boolean;
            filename?: string;
            error?: string;
          }>;
          errors: Array<{
            source: string;
            error: string;
          }>;
        }>("import_documents", {
          request: {
            file_data: [fileData],
          },
        });

        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status === "canceled") {
          continue;
        }

        const fileResult = result.results[0];
        if (fileResult?.success) {
          updateItemStatus(itemId, "success", {
            completedAt: new Date(),
            fileData: fileData.data,
          });
        } else {
          const errorMsg = fileResult?.error || t("importFailed");
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(itemId, "success", {
              completedAt: new Date(),
              fileData: fileData.data,
            });
          } else {
            updateItemStatus(itemId, "failed", {
              error: errorMsg,
              fileData: fileData.data,
            });
          }
        }
      } catch (error) {
        const status = useImportStore.getState().currentBatch?.items[i]?.status;
        if (status !== "canceled") {
          updateItemStatus(itemId, "failed", {
            error: error instanceof Error ? error.message : String(error),
            fileData: fileData.data,
          });
        }
      }
    }

    setImporting(false);
    setUrls([""]);
    setUrlErrors([""]);
    onOpenChange(false);
    onImportComplete();

    const batch = useImportStore.getState().currentBatch;
    if (batch) {
      showImportCompleteToast(batch, "document", t);
    }
  };

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderImport = () => {
    folderInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-1xl max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              {t("filesAndFolders")}
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {t("importFromUrls")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("dropFilesHere")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("dragDropDescription")}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={triggerFileImport} disabled={importing}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {t("selectFiles")}
                </Button>
                <Button
                  variant="outline"
                  onClick={triggerFolderImport}
                  disabled={importing}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {t("selectFolder")}
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.djvu"
              multiple
              onChange={handleFileImport}
              style={{ display: "none" }}
            />
            <input
              ref={folderInputRef}
              type="file"
              accept=".pdf,.epub,.djvu"
              multiple
              onChange={handleFileImport}
              style={{ display: "none" }}
              // @ts-expect-error - webkitdirectory is not in the standard types
              webkitdirectory=""
            />
          </TabsContent>

          <TabsContent value="urls" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t("pdfUrlsLabel")}</Label>

              {urls.map((url, index) => (
                <div key={index}>
                  <InputGroup>
                    <Input
                      placeholder={t("urlPlaceholder")}
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      className={urlErrors[index] ? "border-red-500" : ""}
                    />
                    {urls.length > 1 && (
                      <InputGroupButton onClick={() => removeUrl(index)}>
                        <XIcon className="h-4 w-4" />
                      </InputGroupButton>
                    )}
                  </InputGroup>
                  {urlErrors[index] && (
                    <p className="text-sm text-red-500 mt-1">
                      {urlErrors[index]}
                    </p>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addUrl}
                className="w-full"
                disabled={importing}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t("addAnotherUrl")}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>{t("supportedFormats")}</p>
              <p>{t("maxFileSize")}</p>
            </div>
          </TabsContent>
        </Tabs>

        {activeTab === "urls" && (
          <Button onClick={handleUrlImport} disabled={importing}>
            {t("importUrls")}
          </Button>
        )}

        {!drawerOpen && currentBatch && (
          <Button
            onClick={() => setDrawerOpen(true)}
            variant="outline"
            className="w-full"
          >
            {t("showImportProgress")}
          </Button>
        )}

        <ImportDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </DialogContent>
    </Dialog>
  );
}
