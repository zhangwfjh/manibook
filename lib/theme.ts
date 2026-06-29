"use client";

import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = "atelier" | "graphite" | "verdant" | "carbon" | "linen";

export type FullTheme = `${ThemeMode}-${ColorTheme}`;

export const COLOR_THEMES: { value: ColorTheme; label: string; description: string }[] = [
  { value: "atelier", label: "Atelier", description: "Warm archival studio — cream, ink, oxblood" },
  { value: "graphite", label: "Graphite", description: "Cool technical — steel-blue, hairline precision" },
  { value: "verdant", label: "Verdant", description: "Calm scholarship — green-tinted cream, emerald" },
  { value: "carbon", label: "Carbon", description: "Dark-first deep work — carbon black, amber" },
  { value: "linen", label: "Linen", description: "Airy daylight — linen white, muted indigo" },
];

export const MODE_THEMES: { value: ThemeMode; label: string; description: string }[] = [
  { value: "light", label: "Light", description: "Light color scheme" },
  { value: "dark", label: "Dark", description: "Dark color scheme" },
  { value: "system", label: "System", description: "Follow system preference" },
];

export function useTheme() {
  const { theme: mode, setTheme, systemTheme } = useNextThemes();
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    const savedFullTheme = typeof window !== "undefined" ? localStorage.getItem("full-theme") as FullTheme : null;
    if (savedFullTheme) {
      const [, savedColor] = savedFullTheme.split("-");
      if (savedColor && COLOR_THEMES.find((t) => t.value === savedColor)) {
        return savedColor as ColorTheme;
      }
    }
    return "atelier";
  });

  useEffect(() => {
    if (!mode) return;

    const currentMode = mode === "system" ? "system" : (mode as ThemeMode);
    const fullTheme: FullTheme = `${currentMode}-${colorTheme}`;
    localStorage.setItem("full-theme", fullTheme);

    const root = document.documentElement;
    root.setAttribute("data-color", colorTheme);
  }, [colorTheme, mode]);

  const setFullTheme = (fullTheme: FullTheme) => {
    const [newMode, newColor] = fullTheme.split("-") as [ThemeMode, ColorTheme];
    setTheme(newMode);
    setColorTheme(newColor);
  };

  const getResolvedMode = (): ThemeMode => {
    if (mode === "system") {
      return systemTheme === "dark" ? "dark" : "light";
    }
    return mode as ThemeMode;
  };

  return {
    mode: mode as ThemeMode | undefined,
    colorTheme,
    setMode: setTheme,
    setColorTheme,
    setFullTheme,
    getResolvedMode,
  };
}
