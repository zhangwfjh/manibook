"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ButtonGroup } from "@/components/ui/button-group";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderIcon } from "lucide-react";

interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  onSubmit: (name: string, path: string) => Promise<boolean>;
  onCancel: () => void;
}

export function CreateLibraryDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  path,
  onPathChange,
  onSubmit,
  onCancel,
}: CreateLibraryDialogProps) {
  const t = useTranslations("dialogs.createLibrary");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(name, path);
    if (success) {
      onCancel();
    }
  };

  const handleBrowse = async () => {
    try {
      const selectedPath = await openDialog({
        directory: true,
        multiple: false,
        title: t("selectLibraryFolder"),
      });
      if (selectedPath) {
        onPathChange(selectedPath);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("name")}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="col-span-3"
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="path" className="text-right">
                {t("path")}
              </Label>
              <ButtonGroup className="col-span-3">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => onPathChange(e.target.value)}
                  placeholder={t("pathPlaceholder")}
                />
                <Button type="button" variant="outline" onClick={handleBrowse}>
                  <FolderIcon className="h-4 w-4" />
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
