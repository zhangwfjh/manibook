import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

interface UseLibraryOperationsProps {
  setCurrentLibrary: (library: string) => void;
  onLibrariesChange: () => void;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  resetCreateDialog: () => void;
}

export function useLibraryOperations({
  setCurrentLibrary,
  onLibrariesChange,
  setCreateLibraryOpen,
  newLibraryName,
  setNewLibraryName,
  newLibraryPath,
  setNewLibraryPath,
  resetCreateDialog,
}: UseLibraryOperationsProps) {

  const handleCreateLibrary = async () => {
    if (!newLibraryName || !newLibraryPath) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await invoke("create_library", { name: newLibraryName, path: newLibraryPath });
      await invoke("open_library", { libraryName: newLibraryName });
      toast.success("Library created successfully");
      setCreateLibraryOpen(false);
      setCurrentLibrary(newLibraryName);
      setNewLibraryName("");
      setNewLibraryPath("");
      onLibrariesChange();
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error(typeof error === 'string' ? error : "Failed to create library");
    }
  };

  return {
    handleCreateLibrary,
    resetCreateDialog,
  };
}
