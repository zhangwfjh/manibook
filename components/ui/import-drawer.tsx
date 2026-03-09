"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
  XIcon,
  DownloadIcon,
  RotateCcwIcon,
  BanIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useImportStore, type ImportItem } from "@/stores";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/components/ui/item";
import { invoke } from "@tauri-apps/api/core";

interface ImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusIcon(status: ImportItem["status"]) {
  switch (status) {
    case "importing":
      return <Loader2Icon className="h-4 w-4 animate-spin text-blue-600" />;
    case "success":
      return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
    case "failed":
      return <XCircleIcon className="h-4 w-4 text-red-600" />;
    case "canceled":
      return <XCircleIcon className="h-4 w-4 text-gray-600" />;
    default:
      return null;
  }
}

function exportImportProgress(
  batch: { id: string; items: ImportItem[] } | null,
) {
  if (!batch) return;

  const headers = ["Filename", "Status", "Timestamp", "Path", "Error"];
  const csvContent = [
    headers.join(","),
    ...batch.items.map((item: ImportItem) =>
      [
        `"${item.filename}"`,
        item.status,
        item.completedAt ? format(item.completedAt, "yyyy-MM-dd HH:mm:ss") : "",
        `"${item.path || ""}"`,
        `"${item.error || ""}"`,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-progress-${batch.id}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success(`Export completed successfully, downloaded as ${a.download}.`);
}

async function retryFailedItems(
  batch: { id: string; items: ImportItem[] } | null,
  updateItemStatus: (
    itemId: string,
    status: ImportItem["status"],
    options?: { completedAt?: Date; error?: string; path?: string },
  ) => void,
) {
  if (!batch) return;

  const failedItems = batch.items.filter((item) => item.status === "failed");

  if (failedItems.length === 0) {
    return;
  }

  for (let i = 0; i < failedItems.length; i++) {
    const item = failedItems[i];

    updateItemStatus(item.id, "importing");

    if (item.path && item.path.startsWith("http")) {
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
            urls: [item.path],
          },
        });

        const currentBatch = useImportStore.getState().currentBatch;
        const currentItem = currentBatch?.items.find((i) => i.id === item.id);
        if (currentItem?.status === "canceled") {
          continue;
        }

        const itemResult = result.results[0];
        if (itemResult?.success) {
          updateItemStatus(item.id, "success", { completedAt: new Date() });
        } else {
          const errorMsg = itemResult?.error || "Import failed";
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(item.id, "success", { completedAt: new Date() });
          } else {
            updateItemStatus(item.id, "failed", { error: errorMsg });
          }
        }
      } catch (error) {
        const currentBatch = useImportStore.getState().currentBatch;
        const currentItem = currentBatch?.items.find((i) => i.id === item.id);
        if (currentItem?.status !== "canceled") {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          updateItemStatus(item.id, "failed", { error: errorMessage });
        }
      }
    } else if (item.fileData) {
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
            file_data: [
              {
                filename: item.filename,
                data: item.fileData,
              },
            ],
          },
        });

        const currentBatch = useImportStore.getState().currentBatch;
        const currentItem = currentBatch?.items.find((i) => i.id === item.id);
        if (currentItem?.status === "canceled") {
          continue;
        }

        const itemResult = result.results[0];
        if (itemResult?.success) {
          updateItemStatus(item.id, "success", { completedAt: new Date() });
        } else {
          const errorMsg = itemResult?.error || "Import failed";
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(item.id, "success", { completedAt: new Date() });
          } else {
            updateItemStatus(item.id, "failed", { error: errorMsg });
          }
        }
      } catch (error) {
        const currentBatch = useImportStore.getState().currentBatch;
        const currentItem = currentBatch?.items.find((i) => i.id === item.id);
        if (currentItem?.status !== "canceled") {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          updateItemStatus(item.id, "failed", { error: errorMessage });
        }
      }
    }
  }
}

export function ImportDrawer({ open, onOpenChange }: ImportDrawerProps) {
  const { currentBatch, cancelItem, updateItemStatus } = useImportStore();

  if (!currentBatch) {
    return null;
  }

  const { total, completed, failed, items } = currentBatch;
  const processed = completed + failed;
  const progressValue = total > 0 ? (processed / total) * 100 : 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="flex flex-row items-center justify-between">
          <DrawerTitle>Import Progress</DrawerTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (currentBatch) {
                  currentBatch.items.forEach((item: ImportItem) => {
                    if (item.status === "importing") {
                      cancelItem(item.id);
                    }
                  });
                }
              }}
              disabled={
                !currentBatch ||
                !currentBatch.items.some(
                  (item: ImportItem) => item.status === "importing",
                )
              }
            >
              <BanIcon className="h-4 w-4 mr-2" />
              Cancel All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => retryFailedItems(currentBatch, updateItemStatus)}
              disabled={
                !currentBatch ||
                !currentBatch.items.some(
                  (item: ImportItem) => item.status === "failed",
                )
              }
            >
              <RotateCcwIcon className="h-4 w-4 mr-2" />
              Retry Failed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportImportProgress(currentBatch)}
              disabled={!currentBatch || currentBatch.items.length === 0}
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Export
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <XIcon className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Importing {processed} of {total} files
                </span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="w-full" />
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {items.map((item: ImportItem) => (
                  <Item key={item.id} variant="outline" size="sm">
                    <ItemMedia>{getStatusIcon(item.status)}</ItemMedia>
                    <ItemContent>
                      <ItemTitle className="truncate">
                        {item.filename}
                      </ItemTitle>
                      {item.status === "success" && item.completedAt && (
                        <ItemDescription>
                          Completed at {format(item.completedAt, "HH:mm:ss")}
                          {item.path && (
                            <>
                              <br />
                              <span className="text-muted-foreground mt-1">
                                Imported from: {item.path}
                              </span>
                            </>
                          )}
                        </ItemDescription>
                      )}
                      {item.status === "failed" && item.error && (
                        <ItemDescription className="text-red-600">
                          {item.error}
                        </ItemDescription>
                      )}
                    </ItemContent>
                    {item.status === "importing" && (
                      <ItemActions>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelItem(item.id)}
                        >
                          Cancel
                        </Button>
                      </ItemActions>
                    )}
                  </Item>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
