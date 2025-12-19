"use client";

import { HomeIcon, SunMoonIcon, MessageCircleIcon, BookIcon } from "lucide-react";
import {
  Dock,
  DockIcon,
  DockItem,
  DockLabel,
} from "@/components/ui/shadcn-io/dock";
import { useTheme } from "next-themes";

export function DockMenu() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="absolute bottom-2 left-1/2 max-w-full -translate-x-1/2">
      <Dock className="items-end pb-3">
        <DockItem
          className="aspect-square rounded-full bg-gray-200 dark:bg-neutral-800"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <DockLabel>Home</DockLabel>
          <DockIcon>
            <HomeIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
          </DockIcon>
        </DockItem>
        <DockItem
          className="aspect-square rounded-full bg-gray-200 dark:bg-neutral-800"
          onClick={() => {
            window.location.href = "/library";
          }}
        >
          <DockLabel>Library</DockLabel>
          <DockIcon>
            <BookIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
          </DockIcon>
        </DockItem>
        <DockItem
          className="aspect-square rounded-full bg-gray-200 dark:bg-neutral-800"
          onClick={() => {
            window.location.href = "/chat";
          }}
        >
          <DockLabel>Chat</DockLabel>
          <DockIcon>
            <MessageCircleIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
          </DockIcon>
        </DockItem>
        <DockItem
          className="aspect-square rounded-full bg-gray-200 dark:bg-neutral-800"
          onClick={() => {
            if (theme === "dark") {
              setTheme("light");
            } else {
              setTheme("dark");
            }
          }}
        >
          <DockLabel>Theme</DockLabel>
          <DockIcon>
            <SunMoonIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
          </DockIcon>
        </DockItem>
      </Dock>
    </div>
  );
}