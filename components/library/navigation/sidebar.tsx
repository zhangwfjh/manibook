"use client";

import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Shelf } from "./shelf";
import { Filter } from "@/components/ui/filter";
import { useLibraryFilterStore, useLibraryDataStore } from "@/stores";
import { useFilterWithReload } from "@/hooks/library";
import { useTranslations } from "next-intl";

export function LibrarySidebar() {
  const t = useTranslations("navigation");

  const {
    selectedKeywords,
    selectedFormats,
    selectedAuthors,
    selectedPublishers,
    selectedLanguages,
    showFavoritesOnly,
  } = useLibraryFilterStore();

  const { filterOptions } = useLibraryDataStore();

  const {
    setSelectedKeywords,
    setSelectedFormats,
    setSelectedAuthors,
    setSelectedPublishers,
    setSelectedLanguages,
    setShowFavoritesOnly,
  } = useFilterWithReload();

  return (
    <>
      <SidebarHeader className="p-4">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight leading-none flex items-baseline gap-1.5">
            <span className="text-primary text-base leading-none" aria-hidden>❦</span>
            <span>ManiBook</span>
          </h1>
          <p className="text-muted-foreground text-[11px] italic leading-snug border-l-2 border-primary/30 pl-2">
            {t("tagline")}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <div className="space-y-6">
          <Shelf />

          <Separator />

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("filters")}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="favorites"
              checked={showFavoritesOnly}
              onCheckedChange={setShowFavoritesOnly}
            />
            <Label htmlFor="favorites" className="text-sm">
              {t("showOnlyFavorites")}
            </Label>
          </div>

          <Filter
            title={t("formats")}
            selectedItems={selectedFormats}
            onItemsChange={setSelectedFormats}
            filterOptions={filterOptions?.formats || {}}
          />

          <Filter
            title={t("keywords")}
            selectedItems={selectedKeywords}
            onItemsChange={setSelectedKeywords}
            filterOptions={filterOptions?.keywords || {}}
          />

          <Filter
            title={t("authors")}
            selectedItems={selectedAuthors}
            onItemsChange={setSelectedAuthors}
            filterOptions={filterOptions?.authors || {}}
          />

          <Filter
            title={t("publishers")}
            selectedItems={selectedPublishers}
            onItemsChange={setSelectedPublishers}
            filterOptions={filterOptions?.publishers || {}}
          />

          <Filter
            title={t("languages")}
            selectedItems={selectedLanguages}
            onItemsChange={setSelectedLanguages}
            filterOptions={filterOptions?.languages || {}}
          />
        </div>
      </SidebarContent>
    </>
  );
}
