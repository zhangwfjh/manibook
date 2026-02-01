import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";

interface UseLibraryOperationsProps {
  setLibraryName: (library: string) => void;
  onLibrariesChange: () => void;
}

interface CreateLibraryParams {
  name: string;
  path: string;
}

export function useLibraryOperations({
  setLibraryName,
  onLibrariesChange,
}: UseLibraryOperationsProps) {
  const handleCreateLibrary = async ({ name, path }: CreateLibraryParams) => {
    if (!name || !path) {
      toast.error("Please fill in all fields");
      return false;
    }

    try {
      await invoke("create_library", { name, path });
      await invoke("open_library", { libraryName: name });
      toast.success("Library created successfully");
      setLibraryName(name);
      onLibrariesChange();
      return true;
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error(typeof error === 'string' ? error : "Failed to create library");
      return false;
    }
  };

  return {
    handleCreateLibrary,
  };
}
