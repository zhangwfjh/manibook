"use client";

import { useState, useEffect } from "react";
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
  fetchUrlAsData,
  processBatchImport,
  SuccessfulImport,
  FileData,
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
  const [activeTab, setActiveTab] = useState("files");
  const [importing, setImporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successfulImports, setSuccessfulImports] = useState<
    SuccessfulImport[]
  >([]);
  const { currentBatch } = useImportStore();

  const [urls, setUrls] = useState<string[]>([""]);
  const [urlErrors, setUrlErrors] = useState<string[]>([]);

  const processFilePaths = async (paths: string[]) => {
    if (paths.length === 0) return;

    try {
      const filePaths: string[] = [];

      for (const path of paths) {
        if (isAllowedExtension(path)) {
          filePaths.push(path);
        } else {
          try {
            const dirFiles = await invoke<string[]>("read_directory", { path });
            filePaths.push(...dirFiles);
          } catch {}
        }
      }

      if (filePaths.length === 0) {
        toast.error(t("invalidFilesError"));
        return;
      }

      const sources = await Promise.all(
        filePaths.map(async (filePath) => {
          const fileName = filePath.split(/[\\/]/).pop() || filePath;
          const data = await invoke<number[]>("read_file", { path: filePath });
          return {
            fileData: {
              filename: fileName,
              data: data,
            } as FileData,
            displayName: fileName,
            path: filePath,
          };
        }),
      );

      setDrawerOpen(true);
      setImporting(true);

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
      console.error("Failed to read files:", error);
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

    try {
      const entries = await readDir(selected);
      const filePaths: string[] = [];

      for (const entry of entries) {
        if (entry.isFile && entry.name) {
          const fullPath = `${selected}\\${entry.name}`;
          if (isAllowedExtension(fullPath)) {
            filePaths.push(fullPath);
          }
        }
      }

      await processFilePaths(filePaths);
    } catch (error) {
      console.error("Failed to read folder:", error);
      toast.error(t("failedToReadFiles"));
    }
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === "drop") {
            processFilePaths(event.payload.paths);
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

    try {
      const sources = await Promise.all(
        validUrls.map(async (url) => ({
          fileData: await fetchUrlAsData(url),
          displayName: url.split("/").pop() || t("unknown"),
          path: url,
        })),
      );

      setDrawerOpen(true);
      setImporting(true);

      await processBatchImport(sources, {
        itemType: "document",
        onComplete: () => {
          onOpenChange(false);
          onImportComplete();
        },
        t,
      });
    } catch {}

    setUrls([""]);
    setUrlErrors([""]);
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
