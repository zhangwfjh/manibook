"use client";

import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useRef, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = "slate" | "blue" | "green" | "purple" | "rose" | "orange";

export type FullTheme = `${ThemeMode}-${ColorTheme}`;

export const COLOR_THEMES: { value: ColorTheme; label: string; description: string }[] = [
  { value: "slate", label: "Slate", description: "Neutral and professional" },
  { value: "blue", label: "Blue", description: "Calm and trustworthy" },
  { value: "green", label: "Green", description: "Fresh and natural" },
  { value: "purple", label: "Purple", description: "Creative and modern" },
  { value: "rose", label: "Rose", description: "Warm and inviting" },
  { value: "orange", label: "Orange", description: "Energetic and bold" },
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
    return "slate";
  });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!mounted.current) return;

    const currentMode = mode === "system" ? "system" : (mode as ThemeMode);
    const fullTheme: FullTheme = `${currentMode}-${colorTheme}`;
    localStorage.setItem("full-theme", fullTheme);

    const root = document.documentElement;
    root.setAttribute("data-color", colorTheme);
  }, [colorTheme, mode, mounted]);

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
    mounted,
  };
}
