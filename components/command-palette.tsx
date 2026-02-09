"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  PlusIcon,
  XIcon,
  SearchIcon,
  UploadIcon,
  FileDownIcon,
  FolderOpenIcon,
  SettingsIcon,
} from "lucide-react";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryUIStore,
  useImportStore,
} from "@/stores";
import { toast } from "sonner";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { libraries, libraryName, setLibraryName } = useLibraryDataStore();
  const { setSearchQuery } = useLibraryFilterStore();
  const { setCreateLibraryOpen, setSettingsOpen } = useLibraryUIStore();
  const { setImportDialogOpen } = useImportStore();

  // Keyboard shortcut handler (Cmd/Ctrl + P)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleCreateLibrary = () => {
    setOpen(false);
    setCreateLibraryOpen(true);
  };

  const handleCloseLibrary = () => {
    setOpen(false);
    setLibraryName("");
    toast.success("Library closed");
  };

  const handleOpenLibrary = (name: string) => {
    setOpen(false);
    setLibraryName(name);
    if (libraryName === name) {
      toast.success(`Library is already open: ${name}`);
    } else {
      toast.success(`Opened library: ${name}`);
    }
  };

  const handleSearch = (query: string) => {
    setOpen(false);
    setSearchQuery(query);
  };

  const handleImport = () => {
    setOpen(false);
    setImportDialogOpen(true);
  };

  const handleSettings = () => {
    setOpen(false);
    setSettingsOpen(true);
  };

  const handleExportLogs = async () => {
    setOpen(false);

    try {
      const filePath = await saveDialog({
        defaultPath: `manibook-logs-${new Date().toISOString().split("T")[0]}.txt`,
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (!filePath) return;

      await invoke("export_logs", { targetPath: filePath });
      toast.success("Logs exported successfully");
    } catch (error) {
      console.error("Error exporting logs:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error) || "Unknown error";
      toast.error(`Failed to export logs: ${errorMessage}`);
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchValue("");
      }}
    >
      <CommandInput
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Libraries">
          <CommandItem onSelect={handleCreateLibrary}>
            <PlusIcon className="mr-2 h-4 w-4" />
            <span>Create Library</span>
          </CommandItem>
          {libraryName && (
            <CommandItem onSelect={handleCloseLibrary}>
              <XIcon className="mr-2 h-4 w-4" />
              <span>Close Current Library</span>
              <CommandShortcut>{libraryName}</CommandShortcut>
            </CommandItem>
          )}
          {libraries.length > 0 && (
            <>
              <CommandSeparator />
              {libraries.map((lib) => (
                <CommandItem
                  key={lib.name}
                  onSelect={() => handleOpenLibrary(lib.name)}
                >
                  <FolderOpenIcon className="mr-2 h-4 w-4" />
                  <span>{libraryName === lib.name ? `${lib.name} (current)` : `Open ${lib.name}`}</span>
                </CommandItem>
              ))}
            </>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Documents">
          <CommandItem
            onSelect={() => {
              if (searchValue.trim()) {
                handleSearch(searchValue.trim());
              }
            }}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>Search Documents</span>
            {searchValue && (
              <CommandShortcut>&ldquo;{searchValue}&rdquo;</CommandShortcut>
            )}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleImport}>
            <UploadIcon className="mr-2 h-4 w-4" />
            <span>Import Documents</span>
          </CommandItem>
          <CommandItem onSelect={handleSettings}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={handleExportLogs}>
            <FileDownIcon className="mr-2 h-4 w-4" />
            <span>Export Logs</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
