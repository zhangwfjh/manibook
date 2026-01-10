import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;
  handleRenameLibrary: () => void;
  resetDialog: () => void;
}

export function RenameDialog({
  open,
  onOpenChange,
  renameLibraryName,
  setRenameLibraryName,
  handleRenameLibrary,
  resetDialog,
}: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button onClick={handleRenameLibrary}>Rename</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
