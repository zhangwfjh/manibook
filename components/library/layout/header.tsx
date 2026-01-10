import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HeaderProps {
  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  handleCreateLibrary: () => void;
  resetCreateDialog: () => void;
}

export function Header({
  createLibraryOpen,
  setCreateLibraryOpen,
  newLibraryName,
  setNewLibraryName,
  newLibraryPath,
  setNewLibraryPath,
  handleCreateLibrary,
  resetCreateDialog,
}: HeaderProps) {
  return (
    <div className="mb-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Library
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Organize and browse your collection of books and articles with
            powerful search and filtering
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={createLibraryOpen} onOpenChange={setCreateLibraryOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Library</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="library-name">Library Name</Label>
                  <Input
                    id="library-name"
                    value={newLibraryName}
                    onChange={(e) => setNewLibraryName(e.target.value)}
                    placeholder="Enter library name"
                  />
                </div>
                <div>
                  <Label htmlFor="library-path">Library Location</Label>
                  <Input
                    id="library-path"
                    value={newLibraryPath}
                    onChange={(e) => setNewLibraryPath(e.target.value)}
                    placeholder="Enter full path to library directory (e.g., C:\Users\John\Documents\Library or /home/john/library)"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter the full path to an empty directory where you want to
                    store your library files. The directory will be created if
                    it does not exist.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetCreateDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLibrary}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
