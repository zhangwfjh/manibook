"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("commandPalette");
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { libraries, libraryName, setLibraryName } = useLibraryDataStore();
  const { setSearchQuery } = useLibraryFilterStore();
  const { setCreateLibraryOpen, setSettingsOpen } = useLibraryUIStore();
  const { setImportDialogOpen } = useImportStore();

  // Keyboard shortcut handler (Cmd/Ctrl + K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
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
    toast.success(t("toast.libraryClosed"));
  };

  const handleOpenLibrary = (name: string) => {
    setOpen(false);
    setLibraryName(name);
    if (libraryName === name) {
      toast.success(t("toast.libraryAlreadyOpen", { name }));
    } else {
      toast.success(t("toast.libraryOpened", { name }));
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
      toast.success(t("toast.logsExported"));
    } catch (error) {
      console.error("Error exporting logs:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error) || "Unknown error";
      toast.error(t("toast.logsExportFailed", { error: errorMessage }));
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
        placeholder={t("searchPlaceholder")}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>

        <CommandGroup heading={t("groups.libraries")}>
          <CommandItem onSelect={handleCreateLibrary}>
            <PlusIcon className="mr-2 h-4 w-4" />
            <span>{t("commands.createLibrary")}</span>
          </CommandItem>
          {libraryName && (
            <CommandItem onSelect={handleCloseLibrary}>
              <XIcon className="mr-2 h-4 w-4" />
              <span>{t("commands.closeLibrary")}</span>
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
                  <span>{libraryName === lib.name ? t("commands.currentLibrary", { name: lib.name }) : t("commands.openLibrary", { name: lib.name })}</span>
                </CommandItem>
              ))}
            </>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("groups.documents")}>
          <CommandItem
            onSelect={() => {
              if (searchValue.trim()) {
                handleSearch(searchValue.trim());
              }
            }}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>{t("commands.searchDocuments")}</span>
            {searchValue && (
              <CommandShortcut>&ldquo;{searchValue}&rdquo;</CommandShortcut>
            )}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("groups.actions")}>
          <CommandItem onSelect={handleImport}>
            <UploadIcon className="mr-2 h-4 w-4" />
            <span>{t("commands.importDocuments")}</span>
          </CommandItem>
          <CommandItem onSelect={handleSettings}>
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>{t("commands.settings")}</span>
          </CommandItem>
          <CommandItem onSelect={handleExportLogs}>
            <FileDownIcon className="mr-2 h-4 w-4" />
            <span>{t("commands.exportLogs")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
