"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { save, open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { toast } from "sonner";
import { useLibraryOpsStore } from "@/stores";
import { formatFileSize } from "@/lib/library/utils/formatting";
import { HardDriveDownloadIcon, HardDriveUploadIcon } from "lucide-react";

interface BackupProgress {
  current: number;
  total: number;
}

export function BackupRestorePanel() {
  const t = useTranslations("backup");
  const backupLibrary = useLibraryOpsStore((s) => s.backupLibrary);
  const restoreLibrary = useLibraryOpsStore((s) => s.restoreLibrary);
  const estimateBackupSize = useLibraryOpsStore((s) => s.estimateBackupSize);
  const cancelBackup = useLibraryOpsStore((s) => s.cancelBackup);

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRestorePath, setPendingRestorePath] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [progress, setProgress] = useState<BackupProgress | null>(null);

  // Fetch size estimate on mount
  useEffect(() => {
    estimateBackupSize()
      .then(setEstimatedSize)
      .catch(() => {});
  }, [estimateBackupSize]);

  // Listen for backup/restore progress events
  useEffect(() => {
    const unlisten = listen<BackupProgress>("backup-progress", (event) => {
      setProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    setProgress({ current: 0, total: estimatedSize ?? 0 });
    try {
      const destPath = await save({
        defaultPath: "manibook-backup.zip",
        filters: [{ name: "ZIP", extensions: ["zip"] }],
      });
      if (!destPath) {
        setBackingUp(false);
        setProgress(null);
        return;
      }
      const result = await backupLibrary(destPath);
      if (result === "Backup cancelled") {
        toast.info(t("cancelled"));
      } else {
        toast.success(t("backupSuccess") + ": " + result);
      }
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error(t("backupError"));
    } finally {
      setBackingUp(false);
      setProgress(null);
    }
  };

  const handleRestorePick = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "ZIP", extensions: ["zip"] }],
      });
      if (!selected || typeof selected !== "string") return;
      setPendingRestorePath(selected);
      setConfirmOpen(true);
    } catch (error) {
      console.error("Restore pick failed:", error);
      toast.error(t("restoreError"));
    }
  };

  const handleConfirmRestore = async () => {
    setConfirmOpen(false);
    if (!pendingRestorePath) return;
    setRestoring(true);
    setProgress({ current: 0, total: 0 });
    try {
      await restoreLibrary(pendingRestorePath);
      toast.success(t("restoreSuccess"));
    } catch (error) {
      console.error("Restore failed:", error);
      toast.error(t("restoreError"));
    } finally {
      setRestoring(false);
      setProgress(null);
      setPendingRestorePath(null);
    }
  };

  const handleCancelRestore = () => {
    setConfirmOpen(false);
    setPendingRestorePath(null);
  };

  const progressPct =
    progress && progress.total > 0
      ? (progress.current / progress.total) * 100
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Size estimate */}
      {estimatedSize !== null && !backingUp && !restoring && (
        <p className="text-sm text-muted-foreground">
          {t("estimatedSize")}: <span className="font-medium text-foreground">{formatFileSize(estimatedSize)}</span>
        </p>
      )}

      {/* Progress bar */}
      {(backingUp || restoring) && progress && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{restoring ? t("restore") : t("backup")}</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums">{progressPct.toFixed(1)}%</span>
              {backingUp && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => cancelBackup()}
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleBackup}
          disabled={backingUp || restoring}
        >
          {backingUp ? (
            <Spinner className="mr-2" />
          ) : (
            <HardDriveDownloadIcon className="mr-2 size-4" />
          )}
          {t("backup")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleRestorePick}
          disabled={backingUp || restoring}
        >
          {restoring ? (
            <Spinner className="mr-2" />
          ) : (
            <HardDriveUploadIcon className="mr-2 size-4" />
          )}
          {t("restore")}
        </Button>

        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={t("restoreConfirmTitle")}
          description={t("restoreConfirm")}
          confirmText={t("restore")}
          onConfirm={handleConfirmRestore}
          onCancel={handleCancelRestore}
        />
      </div>
    </div>
  );
}
