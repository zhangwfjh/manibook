"use client";

import * as React from "react";
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, COLOR_THEMES, MODE_THEMES } from "@/lib/theme";

export function ThemeToggle() {
  const { mode, colorTheme, setFullTheme, mounted } = useTheme();

  const getModeIcon = () => {
    if (!mounted) return <MonitorIcon className="h-4 w-4" />;
    if (mode === "system") return <MonitorIcon className="h-4 w-4" />;
    return mode === "dark" ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />;
  };

  const getColorSwatch = (color: string) => {
    const colors: Record<string, string> = {
      slate: "bg-slate-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      rose: "bg-rose-500",
      orange: "bg-orange-500",
    };
    return colors[color] || "bg-slate-500";
  };

  if (!mounted) {
    return (
      <Button variant="outline" size="icon">
        <MonitorIcon className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {getModeIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Theme Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODE_THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => {
              if (colorTheme) {
                setFullTheme(`${theme.value}-${colorTheme}`);
              }
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {theme.value === "light" && <SunIcon className="h-4 w-4" />}
              {theme.value === "dark" && <MoonIcon className="h-4 w-4" />}
              {theme.value === "system" && <MonitorIcon className="h-4 w-4" />}
              <span>{theme.label}</span>
            </div>
            {mode === theme.value && (
              <div className="h-4 w-4 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLOR_THEMES.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => {
              if (mode) {
                setFullTheme(`${mode}-${theme.value}`);
              }
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${getColorSwatch(theme.value)}`} />
              <div className="flex flex-col">
                <span className="font-medium">{theme.label}</span>
                <span className="text-xs text-muted-foreground">
                  {theme.description}
                </span>
              </div>
            </div>
            {colorTheme === theme.value && (
              <div className="h-4 w-4 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
