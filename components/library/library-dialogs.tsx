import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LibraryDialogsProps {
  renameLibraryOpen: boolean;
  setRenameLibraryOpen: (open: boolean) => void;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;
  handleRenameLibrary: () => void;
  resetRenameDialog: () => void;
  archiveLibraryOpen: boolean;
  setArchiveLibraryOpen: (open: boolean) => void;
  currentLibrary: string;
  handleArchiveLibrary: () => void;
}

export function LibraryDialogs({
  renameLibraryOpen,
  setRenameLibraryOpen,
  renameLibraryName,
  setRenameLibraryName,
  handleRenameLibrary,
  resetRenameDialog,
  archiveLibraryOpen,
  setArchiveLibraryOpen,
  currentLibrary,
  handleArchiveLibrary,
}: LibraryDialogsProps) {
  return (
    <>
      {/* Rename Library Dialog */}
      <Dialog open={renameLibraryOpen} onOpenChange={setRenameLibraryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-library-name">New Library Name</Label>
              <Input
                id="rename-library-name"
                value={renameLibraryName}
                onChange={(e) => setRenameLibraryName(e.target.value)}
                placeholder="Enter new library name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetRenameDialog}
              >
                Cancel
              </Button>
              <Button onClick={handleRenameLibrary}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Library Dialog */}
      <Dialog open={archiveLibraryOpen} onOpenChange={setArchiveLibraryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to archive the library "
              {currentLibrary}"? All documents and data in this library
              will be preserved on disk.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setArchiveLibraryOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleArchiveLibrary}>
                Archive Library
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
