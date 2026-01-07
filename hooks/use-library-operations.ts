import { useState } from "react";
import { toast } from "sonner";
import { Library } from "@/lib/library";

interface UseLibraryOperationsProps {
  currentLibrary: string;
  setCurrentLibrary: (library: string) => void;
  libraries: Library[];
  onLibrariesChange: () => void;
}

export function useLibraryOperations({
  currentLibrary,
  setCurrentLibrary,
  libraries,
  onLibrariesChange,
}: UseLibraryOperationsProps) {
  const [createLibraryOpen, setCreateLibraryOpen] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [newLibraryPath, setNewLibraryPath] = useState("");
  const [renameLibraryOpen, setRenameLibraryOpen] = useState(false);
  const [archiveLibraryOpen, setArchiveLibraryOpen] = useState(false);
  const [renameLibraryName, setRenameLibraryName] = useState("");

  const handleCreateLibrary = async () => {
    if (!newLibraryName || !newLibraryPath) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await fetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLibraryName, path: newLibraryPath }),
      });

      if (response.ok) {
        toast.success("Library created successfully");
        setCreateLibraryOpen(false);
        setCurrentLibrary(newLibraryName);
        setNewLibraryName("");
        setNewLibraryPath("");
        onLibrariesChange();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create library");
      }
    } catch (error) {
      console.error("Error creating library:", error);
      toast.error("Failed to create library");
    }
  };

  const handleRenameLibrary = async () => {
    if (!renameLibraryName.trim()) {
      toast.error("Please enter a new library name");
      return;
    }

    if (renameLibraryName === currentLibrary) {
      toast.error("New name must be different from current name");
      return;
    }

    try {
      const response = await fetch(`/api/libraries/${currentLibrary}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: renameLibraryName }),
      });

      if (response.ok) {
        toast.success("Library renamed successfully");
        setRenameLibraryOpen(false);
        setCurrentLibrary(renameLibraryName);
        setRenameLibraryName("");
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

  const handleArchiveLibrary = async () => {
    try {
      const response = await fetch(`/api/libraries/${currentLibrary}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Library archived successfully");
        setArchiveLibraryOpen(false);
        // Switch to the first available library
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
    setRenameLibraryName(libraryName);
    setRenameLibraryOpen(true);
  };

  const handleOpenArchiveDialog = (libraryName: string) => {
    setCurrentLibrary(libraryName);
    setArchiveLibraryOpen(true);
  };

  const resetCreateDialog = () => {
    setCreateLibraryOpen(false);
    setNewLibraryName("");
    setNewLibraryPath("");
  };

  const resetRenameDialog = () => {
    setRenameLibraryOpen(false);
    setRenameLibraryName("");
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
    archiveLibraryOpen,
    setArchiveLibraryOpen,
    renameLibraryName,
    setRenameLibraryName,

    // Handlers
    handleCreateLibrary,
    handleRenameLibrary,
    handleArchiveLibrary,
    handleOpenRenameDialog,
    handleOpenArchiveDialog,
    resetCreateDialog,
    resetRenameDialog,
  };
}
