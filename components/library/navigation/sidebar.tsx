"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookMarkedIcon, StarIcon } from "lucide-react";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Shelf } from "./shelf";
import { Filter } from "@/components/ui/filter";
import { useLibraryFilterStore, useLibraryDataStore } from "@/stores";
import { useFilterWithReload } from "@/hooks/library";
import type { Category } from "@/lib/library";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** Total documents shelved under a category subtree (stable, view-independent). */
function countDocs(cat: Category): number {
  let count = cat.documents.length;
  for (const child of cat.children) count += countDocs(child);
  return count;
}

interface SectionLabelProps {
  label: string;
  count?: number;
  action?: React.ReactNode;
}

/**
 * Catalog-divider section label: a small uppercase tracking word, an optional
 * mono count badge, a hairline rule running to the edge, and an optional
 * trailing action — modeled on the divider cards in a physical card catalog.
 */
function SectionLabel({ label, count, action }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-2 px-1">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
        {label}
      </h3>
      {count != null && count > 0 && (
        <Badge
          variant="secondary"
          className="h-4 min-w-4 px-1 text-[10px] font-medium tabular-nums font-mono"
        >
          {count}
        </Badge>
      )}
      <div className="h-px flex-1 bg-border/60" />
      {action}
    </div>
  );
}

export function LibrarySidebar() {
  const t = useTranslations("navigation");
  const {
    selectedCategory,
    selectedKeywords,
    selectedFormats,
    selectedAuthors,
    selectedPublishers,
    selectedLanguages,
    showFavoritesOnly,
  } = useLibraryFilterStore();

  const { filterOptions, categories, libraryName } = useLibraryDataStore();
  const {
    setSelectedCategory,
    setSelectedKeywords,
    setSelectedFormats,
    setSelectedAuthors,
    setSelectedPublishers,
    setSelectedLanguages,
    setShowFavoritesOnly,
  } = useFilterWithReload();

  const totalVolumes = categories.reduce(
    (total, cat) => total + countDocs(cat),
    0,
  );

  const activeFilterCount =
    selectedFormats.length +
    selectedKeywords.length +
    selectedAuthors.length +
    selectedPublishers.length +
    selectedLanguages.length +
    (showFavoritesOnly ? 1 : 0);

  const handleClearAll = () => {
    setSelectedFormats([]);
    setSelectedKeywords([]);
    setSelectedAuthors([]);
    setSelectedPublishers([]);
    setSelectedLanguages([]);
    setShowFavoritesOnly(false);
  };

  return (
    <>
      <SidebarHeader className="gap-0 px-5 pt-5 pb-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative grid size-7 place-items-center">
              <div
                className="rr-glow absolute inset-0 rounded-full"
                aria-hidden
              />
              <span
                className="relative font-display text-lg leading-none text-primary"
                aria-hidden
              >
                ❦
              </span>
            </div>
            <h1 className="font-display text-[1.6rem] font-semibold leading-none tracking-tight">
              ManiBook
            </h1>
          </div>
          <p className="border-l-2 border-primary/30 pl-2.5 text-[11px] italic leading-snug text-muted-foreground">
            {t("tagline")}
          </p>
          {/* Engraved bookplate double-rule. */}
          <div className="flex flex-col gap-px pt-1">
            <div className="h-px bg-border" />
            <div className="h-px bg-primary/20" />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 pb-4">
        <div className="space-y-5">
          <section
            className="space-y-2 rr-rise"
            style={{ animationDelay: "40ms" }}
          >
            <SectionLabel label={t("shelves")} />
            <button
              type="button"
              onClick={() => setSelectedCategory("")}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-md py-2 pl-2 pr-1.5",
                "text-left transition-colors duration-200",
                !selectedCategory
                  ? "bg-primary/10 hover:bg-primary/15"
                  : "hover:bg-muted/80",
              )}
            >
              {!selectedCategory && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              )}
              <BookMarkedIcon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  !selectedCategory ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "truncate text-sm font-medium transition-colors",
                  !selectedCategory
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {libraryName || t("allDocuments")}
              </span>
              {totalVolumes > 0 && (
                <Badge
                  variant={!selectedCategory ? "default" : "secondary"}
                  className={cn(
                    "ml-auto h-5 shrink-0 px-1.5 text-xs font-normal tabular-nums",
                    !selectedCategory && "bg-primary text-primary-foreground",
                  )}
                >
                  {totalVolumes}
                </Badge>
              )}
            </button>
            <Shelf />
          </section>

          {/* ── Filters ─────────────────────────────────────────── */}
          <section
            className="space-y-3 rr-rise"
            style={{ animationDelay: "120ms" }}
          >
            <SectionLabel
              label={t("filters")}
              count={activeFilterCount}
              action={
                activeFilterCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-5 shrink-0 px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {t("clearAll")}
                  </Button>
                ) : null
              }
            />

            {/* Favorites — a single refined toggle row. */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 transition-colors hover:bg-accent/50">
              <Label
                htmlFor="favorites"
                className="flex min-w-0 cursor-pointer items-center gap-2.5"
              >
                <StarIcon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    showFavoritesOnly
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                />
                <span className="truncate text-sm font-medium">
                  {t("showOnlyFavorites")}
                </span>
              </Label>
              <Switch
                id="favorites"
                checked={showFavoritesOnly}
                onCheckedChange={setShowFavoritesOnly}
              />
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
          </section>
        </div>
      </SidebarContent>
    </>
  );
}
