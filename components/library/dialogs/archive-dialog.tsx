import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLibrary: string;
  handleArchiveLibrary: () => void;
}

export function ArchiveDialog({
  open,
  onOpenChange,
  currentLibrary,
  handleArchiveLibrary,
}: ArchiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to archive the library &ldquo;
            {currentLibrary}&rdquo;? All documents and data in this library
            will be preserved on disk.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
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
  );
}
