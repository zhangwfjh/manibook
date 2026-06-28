"use client";

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    win.isMaximized().then(setMaximized).catch(() => {});
    win
      .onResized(() => {
        win.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => unlisten?.();
  }, []);

  const handleMinimize = () => getCurrentWindow().minimize();
  const handleToggle = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <header
      data-tauri-drag-region
      className="flex h-9 shrink-0 items-center justify-between border-b bg-background/80 backdrop-blur-sm select-none"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 text-xs font-medium text-muted-foreground"
      >
        <span data-tauri-drag-region className="tracking-tight">
          ManiBook
        </span>
      </div>

      <div className="flex h-full items-stretch">
        <button
          type="button"
          aria-label="Minimize"
          onClick={handleMinimize}
          className="inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={handleToggle}
          className="inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted"
        >
          {maximized ? (
            <Copy className="size-3" />
          ) : (
            <Square className="size-3" />
          )}
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="inline-flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
