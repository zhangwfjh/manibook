"use client";

import { create } from "zustand";

const STORAGE_KEY = "manibook:general-settings";

export interface GeneralSettings {
  defaultViewMode: "grid" | "cover" | "list";
  pageSize: number;
  autoExtractMetadata: boolean;
  keepOriginalFilenames: boolean;
  language: string;
}

const DEFAULT_SETTINGS: GeneralSettings = {
  defaultViewMode: "grid",
  pageSize: 50,
  autoExtractMetadata: true,
  keepOriginalFilenames: false,
  language: "en",
};

function loadSettings(): GeneralSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface GeneralSettingsState extends GeneralSettings {
  update: (partial: Partial<GeneralSettings>) => void;
  reset: () => void;
}

export const useGeneralSettingsStore = create<GeneralSettingsState>((set) => ({
  ...loadSettings(),

  update: (partial) => {
    set((state) => {
      const next = { ...state, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore write failures
      }
      return next;
    });
  },

  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set(DEFAULT_SETTINGS);
  },
}));
