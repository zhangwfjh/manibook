"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Document } from "@/lib/library";
import { useLibraryOperations } from "@/stores";
import { DocumentActions } from "./document-actions";
import { DocumentImage } from "./document-image";
import { useLibraryUIStore } from "@/stores";

export const DocumentCard = ({ document }: { document: Document }) => {
  const t = useTranslations("features.documentCard");
  const tActions = useTranslations("features.documentActions");

  // Per-card selectors: this card only re-renders when ITS selection flips,
  // not when any other card is selected.
  const selectionMode = useLibraryUIStore((s) => s.selectionMode);
  const selected = useLibraryUIStore((s) =>
    s.selectedDocuments.has(document.id),
  );
  const handleDocumentClick = useLibraryUIStore((s) => s.handleDocumentClick);
  const toggleDocumentSelection = useLibraryUIStore(
    (s) => s.toggleDocumentSelection,
  );

  const { toggleFavorite } = useLibraryOperations();
  const { metadata } = document;

  const titleForLabel = metadata.title || t("untitled");

  const handleCardClick = () => {
    handleDocumentClick(document, selectionMode);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDocumentClick(document, selectionMode);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(document);
  };

  const cardLabel = selectionMode
    ? t("selectLabel", { title: titleForLabel })
    : t("openLabel", { title: titleForLabel });

  // Footer meta: year is always shown (falls back to missingYear "?").
  // Publisher and category render only when present, each with a preceding "·".
  // Category is stored as "Main > Sub"; render as "Main › Sub".
  const categoryLabel = metadata.category
    ? metadata.category.split(" > ").join(" › ")
    : null;

  const showPublisher = !!metadata.publisher;
  const showCategory = categoryLabel !== null;

  return (
    <Card
      className={cn(
        "group w-full h-full flex flex-row cursor-pointer overflow-hidden p-0 gap-0 border-border/50 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-border",
        selected
          ? "ring-2 ring-primary bg-primary/5 border-primary/40"
          : "shadow-sm",
      )}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={cardLabel}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {/* Cover column — 108px, full height. Placeholder keeps layout stable. */}
      <div className="relative w-[108px] shrink-0 overflow-hidden">
        <DocumentImage document={document} />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0 p-3 gap-2">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className="font-semibold leading-snug line-clamp-2"
              title={metadata.title || undefined}
            >
              {metadata.title || t("untitled")}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {metadata.authors && metadata.authors.length > 0
                ? metadata.authors.join(", ")
                : t("unknownAuthor")}
            </div>
          </div>

          {/* Slot control: heart in normal mode, checkbox in selection mode */}
          {selectionMode ? (
            <div
              className="shrink-0 pt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => toggleDocumentSelection(document.id)}
                aria-label={t("selectLabel", { title: titleForLabel })}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={tActions("favoriteLabel")}
              aria-pressed={metadata.favorite}
              className={cn(
                "shrink-0 transition-colors",
                metadata.favorite
                  ? "text-primary"
                  : "text-muted-foreground/50 hover:text-primary",
              )}
            >
              <HeartIcon
                className={cn("w-[18px] h-[18px]", metadata.favorite && "fill-current")}
              />
            </button>
          )}
        </div>

        {/* Abstract — 2-line clamp + tooltip with full text */}
        {metadata.abstract ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 cursor-help">
                {metadata.abstract}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <div className="text-sm whitespace-pre-wrap">
                {metadata.abstract}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
            {t("noDescription")}
          </p>
        )}

        {/* Footer — meta on the left, actions on the right (hidden in selection mode) */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground flex-wrap min-w-0">
            <span>{metadata.publication_year || t("missingYear")}</span>
            {showPublisher && (
              <>
                <span className="opacity-50">·</span>
                <span>{metadata.publisher}</span>
              </>
            )}
            {showCategory && (
              <>
                <span className="opacity-50">·</span>
                <Badge variant="outline" className="text-[10.5px]">
                  {categoryLabel}
                </Badge>
              </>
            )}
          </div>

          {!selectionMode && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <DocumentActions document={document} showFavorite={false} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
