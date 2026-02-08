"use client";

import React, { useState, useRef, useEffect } from "react";
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

function showImportCompleteToast(
  batch: ImportBatch,
  itemType: "file" | "document",
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

  const pluralize = (count: number) => (count > 1 ? `${itemType}s` : itemType);

  if (canceledCount > 0) {
    if (successCount === 0 && failedCount === 0) {
      toast.info(
        `Import canceled. ${canceledCount} ${pluralize(canceledCount)} canceled.`,
      );
    } else if (failedCount === 0) {
      toast.info(
        `${successCount} ${pluralize(successCount)} imported, ${canceledCount} canceled`,
      );
    } else {
      toast.warning(
        `${successCount} imported, ${failedCount} failed, ${canceledCount} canceled`,
      );
    }
  } else if (failedCount === 0) {
    toast.success(
      `Successfully imported ${successCount} ${pluralize(successCount)}!`,
    );
  } else if (successCount === 0) {
    toast.error(`Failed to import ${failedCount} ${pluralize(failedCount)}`);
  } else {
    toast.warning(`${successCount} imported, ${failedCount} failed`);
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

  useEffect(() => {
    if (currentBatch) {
      const allDone = !currentBatch.items.some(
        (item) => item.status === "importing",
      );
      if (allDone && importing) {
        setImporting(false);
      }
    }
  }, [currentBatch, importing]);

  useEffect(() => {
    if (open) {
      setImporting(false);
    }
  }, [open]);

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
      toast.error(
        "No valid files selected. Only PDF, DJVU, and EPUB files are allowed.",
      );
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

    // Read file data
    const fileDataPromises = filteredFiles.map(async (file) => {
      const buffer = await file.arrayBuffer();
      return {
        filename: file.name,
        data: Array.from(new Uint8Array(buffer)),
      };
    });

    try {
      const fileData = await Promise.all(fileDataPromises);

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
          file_data: fileData,
        },
      });

      // Update status for each file
      filteredFiles.forEach((file, index) => {
        const itemId = `${batchId}-item-${index}`;
        const fileResult = result.results[index];

        if (fileResult?.success) {
          updateItemStatus(itemId, "success", {
            completedAt: new Date(),
          });
        } else {
          const errorMsg = fileResult?.error || "Import failed";
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(itemId, "success", {
              completedAt: new Date(),
            });
          } else {
            updateItemStatus(itemId, "failed", { error: errorMsg });
          }
        }
      });
    } catch (error) {
      console.error("Import error:", error);
      filteredFiles.forEach((_, index) => {
        const itemId = `${batchId}-item-${index}`;
        updateItemStatus(itemId, "failed", {
          error: error instanceof Error ? error.message : "Import failed",
        });
      });
    } finally {
      setImporting(false);
    }

    onImportComplete();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }

    if (currentBatch) {
      showImportCompleteToast(currentBatch, "file");
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
      return "Invalid URL format";
    }
  };

  const handleUrlImport = async () => {
    const validUrls = urls.filter((url) => url.trim());
    if (validUrls.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    const newErrors = urls.map((url) => validateUrl(url));
    setUrlErrors(newErrors);

    if (newErrors.some((error) => error)) {
      toast.error("Please fix the URL errors before importing");
      return;
    }

    clearBatch();

    const importItems = validUrls.map((url) => ({
      filename: url.split("/").pop() || "Unknown",
      status: "importing" as const,
      path: url,
      abortController: new AbortController(),
    }));

    const batchId = addBatch(importItems);
    setDrawerOpen(true);
    setImporting(true);

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
          urls: validUrls,
        },
      });

      // Update status for each URL
      validUrls.forEach((url, index) => {
        const itemId = `${batchId}-item-${index}`;
        const urlResult = result.results[index];

        if (urlResult?.success) {
          updateItemStatus(itemId, "success", {
            completedAt: new Date(),
          });
        } else {
          const errorMsg = urlResult?.error || "Import failed";
          if (errorMsg.toLowerCase().includes("already exists")) {
            // Already imported, treat as success
            updateItemStatus(itemId, "success", {
              completedAt: new Date(),
            });
          } else {
            updateItemStatus(itemId, "failed", { error: errorMsg });
          }
        }
      });

      setUrls([""]);
      setUrlErrors([""]);
      onOpenChange(false);
      onImportComplete();

      if (currentBatch) {
        showImportCompleteToast(currentBatch, "document");
      }
    } catch (error) {
      console.error("Error importing URLs:", error);
      toast.error("Import failed");
      // Mark all as failed
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      validUrls.forEach((url, index) => {
        const itemId = `${batchId}-item-${index}`;
        updateItemStatus(itemId, "failed", { error: errorMessage });
      });
    }

    setImporting(false);
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
          <DialogTitle>Import Documents</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              Files & Folders
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Import from URLs
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
              <h3 className="text-lg font-semibold mb-2">Drop files here</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop PDF, EPUB, or DJVU files, or click the buttons
                below
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={triggerFileImport} disabled={importing}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Select Files
                </Button>
                <Button
                  variant="outline"
                  onClick={triggerFolderImport}
                  disabled={importing}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Select Folder
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
              <Label className="text-sm font-medium">
                PDF URLs (one per line or separate inputs)
              </Label>

              {urls.map((url, index) => (
                <div key={index}>
                  <InputGroup>
                    <Input
                      placeholder="https://example.com/document.pdf"
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
                Add Another URL
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Supported formats: PDF, EPUB, DJVU</p>
              <p>Maximum file size: 100MB per document</p>
            </div>
          </TabsContent>
        </Tabs>

        {activeTab === "urls" && (
          <Button onClick={handleUrlImport} disabled={importing}>
            Import URLs
          </Button>
        )}

        {!drawerOpen && currentBatch && (
          <Button
            onClick={() => setDrawerOpen(true)}
            variant="outline"
            className="w-full"
          >
            Show Import Progress
          </Button>
        )}

        <ImportDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      </DialogContent>
    </Dialog>
  );
}
