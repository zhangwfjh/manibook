import { invoke } from "@tauri-apps/api/core";
import { readDir } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { useImportStore, ImportBatch } from "@/stores/importStore";

export const ALLOWED_EXTENSIONS = ["pdf", "djvu", "epub"] as const;

export type FileExtension = (typeof ALLOWED_EXTENSIONS)[number];

export interface ImportSource {
  type: "file" | "url";
  path?: string;
  url?: string;
}

export interface SuccessfulImport {
  filename: string;
  path: string;
}

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function isAllowedExtension(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension as FileExtension);
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

export async function scanFolderRecursive(folderPath: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(dir: string) {
    try {
      const entries = await readDir(dir);
      for (const entry of entries) {
        const fullPath = `${dir}\\${entry.name}`;
        if (entry.isFile && entry.name && isAllowedExtension(fullPath)) {
          files.push(fullPath);
        } else if (entry.isDirectory) {
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

interface ImportResult {
  results: Array<{
    success: boolean;
    filename: string;
    source_path: string | null;
    error?: string;
  }>;
  errors: Array<{
    source: string;
    error: string;
  }>;
}

function showImportCompleteToast(
  batch: ImportBatch,
  itemType: "file" | "document",
  t: TranslateFn,
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

function chunkSources<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const IMPORT_BATCH_SIZE = 4;

export async function processBatchImport(
  sources: ImportSource[],
  options: {
    itemType: "file" | "document";
    onComplete: () => void;
    onSuccess?: (successfulImports: SuccessfulImport[]) => void;
    t: TranslateFn;
  },
): Promise<void> {
  const { itemType, onComplete, onSuccess, t } = options;
  const { addBatch, updateItemStatus, clearBatch } = useImportStore.getState();

  if (sources.length === 0) {
    toast.error(t("invalidFilesError"));
    return;
  }

  clearBatch();

  const importItems = sources.map((source) => ({
    filename: source.url?.split("/").pop() || source.path?.split(/[\\/]/).pop() || "unknown",
    status: "pending" as const,
    path: source.url || source.path || "",
    source: source,
    abortController: new AbortController(),
  }));

  const batchId = addBatch(importItems);

  const sourceChunks = chunkSources(sources, IMPORT_BATCH_SIZE);

  for (let chunkIdx = 0; chunkIdx < sourceChunks.length; chunkIdx++) {
    const chunk = sourceChunks[chunkIdx];
    const chunkStartIdx = chunkIdx * IMPORT_BATCH_SIZE;

    const activeItems: { source: ImportSource; originalIndex: number }[] = [];

    for (let i = 0; i < chunk.length; i++) {
      const originalIndex = chunkStartIdx + i;
      const currentStatus =
        useImportStore.getState().currentBatch?.items[originalIndex]?.status;

      if (currentStatus !== "canceled") {
        const itemId = `${batchId}-item-${originalIndex}`;
        updateItemStatus(itemId, "processing");
        activeItems.push({
          source: chunk[i],
          originalIndex,
        });
      }
    }

    if (activeItems.length === 0) {
      continue;
    }

    const sourceList = activeItems.map((item) => item.source);

    try {
      const result = await invoke<ImportResult>("import_documents", {
        request: {
          sources: sourceList,
        },
      });

      for (let i = 0; i < activeItems.length; i++) {
        const { originalIndex } = activeItems[i];
        const itemId = `${batchId}-item-${originalIndex}`;

        const currentStatus =
          useImportStore.getState().currentBatch?.items[originalIndex]?.status;
        if (currentStatus === "canceled") {
          continue;
        }

        const fileResult = result.results[i];
        if (fileResult?.success) {
          updateItemStatus(itemId, "success", {
            completedAt: new Date(),
            sourcePath: fileResult.source_path || undefined,
          });
        } else {
          const errorMsg = fileResult?.error || t("importFailed");
          if (errorMsg.toLowerCase().includes("already exists")) {
            updateItemStatus(itemId, "success", {
              completedAt: new Date(),
              sourcePath: fileResult.source_path || undefined,
            });
          } else {
            updateItemStatus(itemId, "failed", { error: errorMsg });
          }
        }
      }
    } catch (error) {
      for (const { originalIndex } of activeItems) {
        const currentStatus =
          useImportStore.getState().currentBatch?.items[originalIndex]?.status;
        if (currentStatus !== "canceled") {
          const itemId = `${batchId}-item-${originalIndex}`;
          updateItemStatus(itemId, "failed", {
            error:
              error instanceof Error ? error.message : t("importFailed"),
          });
        }
      }
    }
  }

  onComplete();

  const batch = useImportStore.getState().currentBatch;
  if (batch) {
    showImportCompleteToast(batch, itemType, t);

    if (onSuccess) {
      const successfulImports: SuccessfulImport[] = batch.items
        .filter((item) => item.status === "success" && item.path)
        .map((item) => ({
          filename: item.filename,
          path: item.path!,
        }));
      onSuccess(successfulImports);
    }
  }
}