"use client";

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

// Inline SVG placeholder shown when a cover cannot be loaded.
const FALLBACK_COVER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDE1MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMSIvPgo8dGV4dCB4PSI3NSIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiPk5vIENvdmVyPC90ZXh0Pgo8L3N2Zz4=";

interface CoverState {
  // documentId -> resolved cover URL (incl. fallback once settled)
  covers: Record<string, string>;
  // documentId -> currently fetching?
  loading: Record<string, boolean>;
  loadCover: (documentId: string) => Promise<void>;
}

export const useCoverStore = create<CoverState>((set, get) => ({
  covers: {},
  loading: {},
  loadCover: async (documentId) => {
    const { covers, loading } = get();
    // Already resolved or in-flight: never refetch.
    if (covers[documentId] !== undefined || loading[documentId]) return;

    set({
      loading: { ...loading, [documentId]: true },
    });

    try {
      const url = await invoke<string>("get_cover", { documentId });
      set({
        covers: { ...get().covers, [documentId]: url },
      });
    } catch {
      set({
        covers: { ...get().covers, [documentId]: FALLBACK_COVER },
      });
    } finally {
      set({
        loading: { ...get().loading, [documentId]: false },
      });
    }
  },
}));
