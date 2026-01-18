import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { Library } from "@/lib/library";

interface UseLibraryOperationsProps {
  currentLibrary: string;
  setCurrentLibrary: (library: string) => void;
  libraries: Library[];
  onLibrariesChange: () => void;
  // Dialog states from DialogContext
  createLibraryOpen: boolean;
  setCreateLibraryOpen: (open: boolean) => void;
  newLibraryName: string;
  setNewLibraryName: (name: string) => void;
  newLibraryPath: string;
  setNewLibraryPath: (path: string) => void;
  renameLibraryOpen: boolean;
  setRenameLibraryOpen: (open: boolean) => void;
  selectedLibraryForOperation: { name: string; path?: string };
  setSelectedLibraryForOperation: (library: { name: string; path?: string }) => void;
  renameLibraryName: string;
  setRenameLibraryName: (name: string) => void;
  moveLibraryOpen: boolean;
  setMoveLibraryOpen: (open: boolean) => void;
  moveLibraryPath: string;
  setMoveLibraryPath: (path: string) => void;
  archiveLibraryOpen: boolean;
  setArchiveLibraryOpen: (open: boolean) => void;
  resetCreateDialog: () => void;
  resetRenameDialog: () => void;
  resetMoveDialog: () => void;
}

export function useLibraryOperations({
  currentLibrary,
  setCurrentLibrary,
  libraries,
  onLibrariesChange,
  // Dialog states from DialogContext
  createLibraryOpen,
  setCreateLibraryOpen,
  newLibraryName,
  setNewLibraryName,
  newLibraryPath,
  setNewLibraryPath,
  renameLibraryOpen,
  setRenameLibraryOpen,
  selectedLibraryForOperation,
  setSelectedLibraryForOperation,
  renameLibraryName,
  setRenameLibraryName,
  moveLibraryOpen,
  setMoveLibraryOpen,
  moveLibraryPath,
  setMoveLibraryPath,
  archiveLibraryOpen,
  setArchiveLibraryOpen,
  resetCreateDialog,
  resetRenameDialog,
  resetMoveDialog,
}: UseLibraryOperationsProps) {

  const handleCreateLibrary = async () => {
    if (!newLibraryName || !newLibraryPath) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await invoke("create_library", { name: newLibraryName, path: newLibraryPath });
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

  const handleRenameLibrary = async () => {
    if (!renameLibraryName.trim()) {
      toast.error("Please enter a new library name");
      return;
    }

    if (renameLibraryName === selectedLibraryForOperation.name) {
      toast.error("New name must be different from current name");
      return;
    }

    try {
      const response = await fetch(
        `/api/libraries/${selectedLibraryForOperation.name}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName: renameLibraryName }),
        }
      );

      if (response.ok) {
        toast.success("Library renamed successfully");
        setRenameLibraryOpen(false);
        if (currentLibrary === selectedLibraryForOperation.name) {
          setCurrentLibrary(renameLibraryName);
        }
        setRenameLibraryName("");
        setSelectedLibraryForOperation({ name: "" });
        onLibrariesChange();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to rename library");
      }
    } catch (error) {
      console.error("Error renaming library:", error);
      toast.error("Failed to rename library");
    }
  };

  const handleMoveLibrary = async () => {
    if (!moveLibraryPath.trim()) {
      toast.error("Please enter a new library path");
      return;
    }

    const targetLibrary = libraries.find(
      (lib) => lib.name === selectedLibraryForOperation.name
    );

    if (!targetLibrary) {
      toast.error("Library not found");
      return;
    }

    if (moveLibraryPath === targetLibrary.path) {
      toast.error("New path must be different from current path");
      return;
    }

    try {
      const response = await fetch(
        `/api/libraries/${selectedLibraryForOperation.name}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPath: moveLibraryPath }),
        }
      );

      if (response.ok) {
        toast.success("Library moved successfully");
        setMoveLibraryOpen(false);
        setMoveLibraryPath("");
        setSelectedLibraryForOperation({ name: "" });
        onLibrariesChange();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to move library");
      }
    } catch (error) {
      console.error("Error moving library:", error);
      toast.error("Failed to move library");
    }
  };

  const handleArchiveLibrary = async () => {
    try {
      const response = await fetch(`/api/libraries/${currentLibrary}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Library archived successfully");
        setArchiveLibraryOpen(false);
        const remainingLibraries = libraries.filter(
          (lib) => lib.name !== currentLibrary
        );
        if (remainingLibraries.length > 0) {
          setCurrentLibrary(remainingLibraries[0].name);
        } else {
          setCurrentLibrary("");
        }
        onLibrariesChange();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to archive library");
      }
    } catch (error) {
      console.error("Error archiving library:", error);
      toast.error("Failed to archive library");
    }
  };

  const handleOpenRenameDialog = (libraryName: string) => {
    setSelectedLibraryForOperation({ name: libraryName });
    setRenameLibraryName(libraryName);
    setRenameLibraryOpen(true);
  };

  const handleOpenMoveDialog = (libraryName: string, currentPath: string) => {
    setSelectedLibraryForOperation({ name: libraryName, path: currentPath });
    setMoveLibraryPath(currentPath);
    setMoveLibraryOpen(true);
  };

  const handleOpenArchiveDialog = (libraryName: string) => {
    setCurrentLibrary(libraryName);
    setArchiveLibraryOpen(true);
  };

  return {
    // Dialog states
    createLibraryOpen,
    setCreateLibraryOpen,
    newLibraryName,
    setNewLibraryName,
    newLibraryPath,
    setNewLibraryPath,
    renameLibraryOpen,
    setRenameLibraryOpen,
    moveLibraryOpen,
    setMoveLibraryOpen,
    archiveLibraryOpen,
    setArchiveLibraryOpen,
    renameLibraryName,
    setRenameLibraryName,
    moveLibraryPath,
    setMoveLibraryPath,
    selectedLibraryForOperation,

    // Handlers
    handleCreateLibrary,
    handleRenameLibrary,
    handleMoveLibrary,
    handleArchiveLibrary,
    handleOpenRenameDialog,
    handleOpenMoveDialog,
    handleOpenArchiveDialog,
    resetCreateDialog,
    resetRenameDialog,
    resetMoveDialog,
  };
}
