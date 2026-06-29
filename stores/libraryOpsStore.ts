"use client";

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Document } from "@/lib/library";
import { useLibraryDataStore } from "./dataStore";

export interface LibraryStats {
  total_documents: number;
  total_pages: number;
  total_size_bytes: number;
  by_doctype: Record<string, number>;
  by_language: Record<string, number>;
  by_format: Record<string, number>;
  by_year: Record<string, number>;
}

interface LibraryOpsState {
  stats: LibraryStats | null;
  fetchStats: () => Promise<void>;
  findDuplicates: () => Promise<Document[][]>;
  estimateBackupSize: () => Promise<number>;
  cancelBackup: () => Promise<void>;
  backupLibrary: (destPath: string) => Promise<string>;
  restoreLibrary: (srcPath: string) => Promise<void>;
}

export const useLibraryOpsStore = create<LibraryOpsState>((set) => ({
  stats: null,

  fetchStats: async () => {
    const { libraryName } = useLibraryDataStore.getState();
    if (!libraryName) return;
    try {
      const stats = await invoke<LibraryStats>("get_library_stats");
      set({ stats });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  },

  findDuplicates: async () => {
    return await invoke<Document[][]>("find_duplicates");
  },

  estimateBackupSize: async () => {
    return await invoke<number>("estimate_backup_size");
  },

  cancelBackup: async () => {
    await invoke("cancel_backup");
  },

  backupLibrary: async (destPath) => {
    return await invoke<string>("backup_library", { destPath });
  },

  restoreLibrary: async (srcPath) => {
    await invoke("restore_library", { srcPath });
  },
}));
