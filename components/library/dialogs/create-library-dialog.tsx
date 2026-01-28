"use client";

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
import { useCallback } from "react";

interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  path: string;
  onPathChange: (path: string) => void;
  onSubmit: () => void;
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleBrowse = useCallback(async () => {
    try {
      const selectedPath = await openDialog({
        directory: true,
        multiple: false,
        title: "Select Library Folder",
      });
      if (selectedPath) {
        onPathChange(selectedPath);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  }, [onPathChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Library</DialogTitle>
          <DialogDescription>
            Create a new library to organize your documents
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="col-span-3"
                placeholder="My Library"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="path" className="text-right">
                Path
              </Label>
              <ButtonGroup className="col-span-3">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => onPathChange(e.target.value)}
                  placeholder="/path/to/library"
                />
                <Button type="button" variant="outline" onClick={handleBrowse}>
                  <FolderIcon className="h-4 w-4" />
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
