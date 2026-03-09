import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { toast } from "sonner";
import { useImportStore, ImportBatch } from "@/stores/importStore";

export const ALLOWED_EXTENSIONS = ["pdf", "djvu", "epub"] as const;

export type FileExtension = (typeof ALLOWED_EXTENSIONS)[number];

export interface FileData {
  filename: string;
  data: number[];
}

export interface ImportSource {
  fileData: FileData;
  displayName: string;
  path: string;
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

export async function readFileAsData(file: File): Promise<FileData> {
  const buffer = await file.arrayBuffer();
  return {
    filename: file.name,
    data: Array.from(new Uint8Array(buffer)),
  };
}

export async function fetchUrlAsData(url: string): Promise<FileData> {
  const response = await tauriFetch(url, { method: "GET" });
  const status = (response as unknown as { status: number }).status;
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status}`);
  }

  const extension = getExtensionFromUrlOrHeaders(url, response.headers);

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const filename = url.split("/").pop() || `document.${extension}`;

  return {
    filename,
    data: Array.from(new Uint8Array(buffer)),
  };
}

function getExtensionFromUrlOrHeaders(
  url: string,
  headers: Headers,
): string {
  const allowedExtensions = [...ALLOWED_EXTENSIONS];
  let extension = getFileExtension(url);

  if (!allowedExtensions.includes(extension as FileExtension)) {
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("pdf")) extension = "pdf";
    else if (contentType.includes("epub")) extension = "epub";
    else if (contentType.includes("djvu")) extension = "djvu";
    else throw new Error("Unable to determine file type");
  }

  return extension;
}

interface ImportResult {
  results: Array<{
    success: boolean;
    filename?: string;
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
    filename: source.displayName,
    status: "importing" as const,
    path: source.path,
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
        activeItems.push({
          source: chunk[i],
          originalIndex,
        });
      }
    }

    if (activeItems.length === 0) {
      continue;
    }

    const fileDataList = activeItems.map((item) => item.source.fileData);

    try {
      const result = await invoke<ImportResult>("import_documents", {
        request: {
          file_data: fileDataList,
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