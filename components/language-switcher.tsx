"use client";

import * as React from "react";
import { GlobeIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "zh-CN", label: "中文", shortLabel: "中文" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const switchLocale = (newLocale: string) => {
    localStorage.setItem("locale", newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const currentLocale = LOCALES.find((l) => l.value === locale) || LOCALES[0];

  if (!mounted) {
    return (
      <Button variant="outline" size="icon">
        <GlobeIcon className="h-4 w-4" />
        <span className="sr-only">Switch language</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 px-2">
          <GlobeIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{currentLocale.shortLabel}</span>
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.value}
            onClick={() => switchLocale(loc.value)}
            className="flex items-center justify-between"
          >
            <span>{loc.label}</span>
            {locale === loc.value && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
