import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { FolderOpenIcon } from "lucide-react";
import * as dialog from "@tauri-apps/plugin-dialog";

type LibraryDialogMode = "create" | "rename" | "move";

interface LibraryDialogProps {
  mode: LibraryDialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  currentName?: string;
  currentPath?: string;

  name?: string;
  path?: string;
  onNameChange?: (name: string) => void;
  onPathChange?: (path: string) => void;

  onSubmit: () => void;
  onCancel: () => void;
}

const dialogConfig = {
  create: {
    title: "Create New Library",
    submitLabel: "Create",
    showName: true,
    showPath: true,
    showCurrentName: false,
    showCurrentPath: false,
  },
  rename: {
    title: "Rename Library",
    submitLabel: "Rename",
    showName: true,
    showPath: false,
    showCurrentName: true,
    showCurrentPath: false,
  },
  move: {
    title: "Move Library",
    submitLabel: "Move",
    showName: false,
    showPath: true,
    showCurrentName: false,
    showCurrentPath: true,
  },
} as const;

export function LibraryDialog({
  mode,
  open,
  onOpenChange,
  currentName,
  currentPath,
  name,
  path,
  onNameChange,
  onPathChange,
  onSubmit,
  onCancel,
}: LibraryDialogProps) {
  const config = dialogConfig[mode];

  const handleBrowseFolder = async () => {
    try {
      const selected = await dialog.open({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        onPathChange?.(selected);
      }
    } catch (error) {
      console.error("Failed to open folder picker:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {config.showCurrentName && currentName && (
            <div className="text-sm text-muted-foreground">
              Current name: <span className="font-medium">{currentName}</span>
            </div>
          )}

          {config.showCurrentPath && currentPath && (
            <div className="text-sm text-muted-foreground">
              Current location:{" "}
              <span className="font-medium">{currentPath}</span>
            </div>
          )}

          {config.showName && (
            <div>
              <Label htmlFor="library-name">Library Name</Label>
              <Input
                id="library-name"
                value={name || ""}
                onChange={(e) => onNameChange?.(e.target.value)}
                placeholder="Enter library name"
              />
            </div>
          )}

          {config.showPath && (
            <div>
              <Label htmlFor="library-path">
                {mode === "create" ? "Library Location" : "New Location"}
              </Label>
              <InputGroup>
                <InputGroupInput
                  id="library-path"
                  value={path || ""}
                  onChange={(e) => onPathChange?.(e.target.value)}
                  placeholder={
                    mode === "create"
                      ? "Select a directory or enter path"
                      : "Enter new path or browse"
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleBrowseFolder}
                    type="button"
                  >
                    <FolderOpenIcon className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {mode === "create" && (
                <p className="text-sm text-muted-foreground mt-1">
                  Click the folder icon to browse, or enter the full path to an
                  empty directory where you want to store your library files.
                  The directory will be created if it does not exist.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>{config.submitLabel}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
