"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readDir } from "@tauri-apps/plugin-fs";
import { getCurrentWebview } from "@tauri-apps/api/webview";
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
  UploadIcon,
  LinkIcon,
  XIcon,
  PlusIcon,
  FileTextIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ImportDrawer } from "@/components/ui/import-drawer";
import { useImportStore } from "@/stores/importStore";
import {
  isAllowedExtension,
  processBatchImport,
  ImportSource,
} from "@/lib/library/import-utils";

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

  const {
    currentBatch,
    importing,
    drawerOpen,
    deleteDialogOpen,
    successfulImports,
    activeTab,
    urls,
    urlErrors,
    setImporting,
    setDrawerOpen,
    setDeleteDialogOpen,
    setSuccessfulImports,
    setActiveTab,
    updateUrl,
    updateUrlError,
    addUrl,
    removeUrl,
    resetUrlState,
    addBatch,
  } = useImportStore();

  const processFilePathsRef = useRef<
    ((paths: string[]) => Promise<void>) | null
  >(null);

  async function scanFolderRecursive(folderPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string) {
      try {
        const entries = await readDir(dir);
        for (const entry of entries) {
          const fullPath = `${dir}\\${entry.name}`;
          if (entry.isFile && entry.name && isAllowedExtension(fullPath)) {
            files.push(fullPath);
          } else if (entry.isDirectory && entry.name) {
            await scan(fullPath);
          }
        }
      } catch (error) {
        console.error(`Failed to scan directory ${dir}:`, error);
      }
    }

    await scan(folderPath);
    return files;
  }

  const processFilePaths = async (paths: string[]) => {
    if (paths.length === 0) return;

    setDrawerOpen(true);

    const sources: ImportSource[] = [];

    for (const path of paths) {
      if (isAllowedExtension(path)) {
        sources.push({ type: "file", path });
      } else {
        try {
          const files = await scanFolderRecursive(path);
          for (const file of files) {
            sources.push({ type: "file", path: file });
          }
        } catch (error) {
          console.error("Failed to scan folder:", error);
          toast.error(t("failedToReadFiles"));
          return;
        }
      }
    }

    if (sources.length === 0) {
      toast.error(t("invalidFilesError"));
      return;
    }

    addBatch(
      sources.map((source) => ({
        filename: source.path?.split(/[\\/]/).pop() || "unknown",
        status: "importing" as const,
        path: source.path || "",
        source,
        abortController: new AbortController(),
      })),
    );

    setImporting(true);

    try {
      await processBatchImport(sources, {
        itemType: "file",
        onComplete: onImportComplete,
        onSuccess: (successful) => {
          setSuccessfulImports(successful);
          if (successful.length > 0) {
            setDeleteDialogOpen(true);
          }
        },
        t,
      });
    } catch (error) {
      console.error("Failed to import files:", error);
      toast.error(t("failedToReadFiles"));
    }

    setImporting(false);
  };

  const handleSelectFiles = async () => {
    const selected = await openDialog({
      multiple: true,
      filters: [
        {
          name: "Documents",
          extensions: ["pdf", "epub", "djvu"],
        },
      ],
    });

    if (!selected) return;

    const paths: string[] = Array.isArray(selected) ? selected : [selected];
    await processFilePaths(paths);
  };

  const handleSelectFolder = async () => {
    const selected = await openDialog({
      directory: true,
    });

    if (!selected) return;

    await processFilePaths([selected]);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "drop") {
            processFilePathsRef.current?.(event.payload.paths);
          }
        });
      } catch (error) {
        console.error("Failed to setup drag-drop listener:", error);
      }
    };

    setupDragDrop();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  processFilePathsRef.current = processFilePaths;

  const handleDeleteOriginals = async () => {
    const paths = successfulImports.map((item) => item.path);
    if (paths.length === 0) return;

    try {
      const result = await invoke<{
        success_count: number;
        failed_count: number;
        errors: Array<{ path: string; error: string }>;
      }>("delete_files", { filePaths: paths });

      if (result.failed_count > 0) {
        toast.error(t("deleteFailed", { count: result.failed_count }));
      } else {
        toast.success(t("deleteSuccess", { count: result.success_count }));
      }
    } catch {
      toast.error(t("deleteError"));
    }

    setDeleteDialogOpen(false);
    setSuccessfulImports([]);
  };

  const handleKeepFiles = () => {
    setDeleteDialogOpen(false);
    setSuccessfulImports([]);
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
    newErrors.forEach((error, index) => updateUrlError(index, error));

    if (newErrors.some((error) => error)) {
      toast.error(t("fixUrlErrors"));
      return;
    }

    const sources: ImportSource[] = validUrls.map((url) => ({
      type: "url" as const,
      url,
    }));

    setDrawerOpen(true);
    setImporting(true);

    try {
      await processBatchImport(sources, {
        itemType: "document",
        onComplete: () => {
          onOpenChange(false);
          onImportComplete();
        },
        t,
      });
    } catch {}

    resetUrlState();
    setImporting(false);
  };

  return (
    <>
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
              <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-muted-foreground/25 hover:border-muted-foreground/50">
                <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("dropFilesHere")}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t("dragDropDescription")}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleSelectFiles} disabled={importing}>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {t("selectFiles")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSelectFolder}
                    disabled={importing}
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    {t("selectFolder")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="urls" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t("pdfUrlsLabel")}
                </Label>

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteOriginalsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteOriginalsDescription", {
                count: successfulImports.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepFiles}>
              {t("keepFiles")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOriginals}>
              <Trash2Icon className="h-4 w-4 mr-2" />
              {t("deleteOriginals")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
