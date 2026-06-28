"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HeartIcon, BookOpenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Document, ViewMode } from "@/lib/library";
import { useLibraryOperations, useLibraryUIStore } from "@/stores";
import { DocumentActions } from "./document-actions";
import { DocumentImage } from "./document-image";

interface DocumentCardProps {
  document: Document;
  variant?: ViewMode;
  index?: number;
}

function FormatBadge({
  doctype,
  transparent = false,
}: {
  doctype: string;
  transparent?: boolean;
}) {
  const fmt = (doctype || "").toUpperCase();
  if (!fmt) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "backdrop-blur-sm text-[10px] font-semibold tracking-wide uppercase h-5 px-1.5",
        transparent
          ? "border-primary/15 bg-card/50 text-primary backdrop-blur-sm"
          : "border-primary/25 bg-card/85 text-primary",
      )}
    >
      {fmt}
    </Badge>
  );
}

function FavoriteButton({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "shrink-0 transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground/50 hover:text-primary",
        className,
      )}
    >
      <HeartIcon
        className={cn("w-[18px] h-[18px]", active && "fill-current")}
      />
    </button>
  );
}

function OpenButton({
  onClick,
  label,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10",
        className,
      )}
    >
      <BookOpenIcon className="w-[18px] h-[18px]" />
    </button>
  );
}

export const DocumentCard = ({
  document,
  variant = "grid",
  index = 0,
}: DocumentCardProps) => {
  const t = useTranslations("features.documentCard");
  const tActions = useTranslations("features.documentActions");

  const selectionMode = useLibraryUIStore((s) => s.selectionMode);
  const selected = useLibraryUIStore((s) =>
    s.selectedDocuments.has(document.id),
  );
  const handleDocumentClick = useLibraryUIStore((s) => s.handleDocumentClick);
  const toggleDocumentSelection = useLibraryUIStore(
    (s) => s.toggleDocumentSelection,
  );

  const { toggleFavorite, openDocument } = useLibraryOperations();
  const { metadata } = document;
  const titleForLabel = metadata.title || t("untitled");

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openDocument(document);
  };

  const handleCardClick = () => {
    handleDocumentClick(document, selectionMode);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
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

  const showPublisher = !!metadata.publisher;
  const pageCount = metadata.page_count;
  const rise = { animationDelay: `${Math.min(index, 16) * 35}ms` };

  const selectionCheckbox = selectionMode ? (
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
  ) : null;

  const favoriteSlot = !selectionMode ? (
    <FavoriteButton
      active={!!metadata.favorite}
      onClick={handleFavoriteClick}
      label={tActions("favoriteLabel")}
    />
  ) : null;

  // ── Grid: horizontal cover + body ────────────────────────────────────
  if (variant === "grid") {
    return (
      <Card
        className={cn(
          "group w-full h-full min-h-[150px] flex flex-row cursor-pointer overflow-hidden p-0 gap-0 border-border/50",
          "transition-transform duration-200 hover:-translate-y-0.5",
          selected
            ? "ring-2 ring-primary bg-primary/5 border-primary/40"
            : "shadow-book hover:border-border",
        )}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={cardLabel}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        {/* Cover */}
        <div className="relative w-[130px] shrink-0 overflow-hidden bg-card rr-rise" style={rise}>
          <DocumentImage document={document} />
          <div className="absolute top-2 left-2 z-10">
            <FormatBadge doctype={metadata.doctype} transparent />
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 flex flex-col min-w-0 p-3.5 gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div
                className="font-display font-semibold leading-snug line-clamp-2 text-[15px]"
                style={{ fontVariationSettings: '"opsz" 14' }}
                title={metadata.title || undefined}
              >
                {metadata.title || t("untitled")}
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                {metadata.authors && metadata.authors.length > 0
                  ? metadata.authors.join(", ")
                  : t("unknownAuthor")}
              </div>
            </div>
            {selectionCheckbox}
            {favoriteSlot}
          </div>

          {metadata.abstract ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-3 cursor-help">
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
            <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-3 italic">
              {t("noDescription")}
            </p>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground min-w-0 overflow-hidden">
              <span className="shrink-0 tabular-nums">
                {metadata.publication_year || t("missingYear")}
              </span>
              {pageCount ? (
                <>
                  <span className="opacity-40 shrink-0">·</span>
                  <span className="shrink-0 tabular-nums">
                    {t("pages", { count: pageCount })}
                  </span>
                </>
              ) : null}
              {showPublisher && (
                <>
                  <span className="opacity-40 shrink-0">·</span>
                  <span className="truncate">{metadata.publisher}</span>
                </>
              )}
            </div>

            {!selectionMode && (
              <div className="flex items-center gap-0.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <DocumentActions document={document} showFavorite={false} showDelete={false} />
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Cover wall: cover-led vertical card ──────────────────────────────
  if (variant === "cover") {
    return (
      <Card
        className={cn(
          "group relative flex flex-col cursor-pointer overflow-hidden p-0 border-border/50",
          "transition-transform duration-200 hover:-translate-y-1",
          selected ? "ring-2 ring-primary border-primary/40" : "shadow-book hover:border-border",
        )}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={cardLabel}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40 rr-rise" style={rise}>
          <DocumentImage document={document} />
          <div className="absolute top-2 left-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            <FormatBadge doctype={metadata.doctype} transparent />
          </div>
          {selectionCheckbox && (
            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-md bg-card/85 backdrop-blur-sm p-0.5">
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleDocumentSelection(document.id)}
                  aria-label={t("selectLabel", { title: titleForLabel })}
                />
              </div>
            </div>
          )}
          {!selectionMode && (
            <div
              className={cn(
                "absolute top-2 right-2 z-10 transition-opacity duration-150",
                metadata.favorite
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <FavoriteButton
                active={!!metadata.favorite}
                onClick={handleFavoriteClick}
                label={tActions("favoriteLabel")}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-card/85 backdrop-blur-sm border border-border/40"
              />
            </div>
          )}
          {/* Title overlay at base of cover */}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background via-background/85 to-transparent px-3 pt-8 pb-2.5">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="font-display font-semibold leading-tight line-clamp-2 text-sm"
                  title={metadata.title || undefined}
                >
                  {metadata.title || t("untitled")}
                </div>
                <div className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">
                  {metadata.authors && metadata.authors.length > 0
                    ? metadata.authors.join(", ")
                    : t("unknownAuthor")}
                </div>
              </div>
              {!selectionMode && (
                <OpenButton
                  onClick={handleOpenClick}
                  label={tActions("openLabel")}
                  className="mb-0.5 h-7 w-7 bg-card/85 backdrop-blur-sm border border-border/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                />
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── List: dense single row ───────────────────────────────────────────
  return (
    <Card
      className={cn(
        "group flex flex-row items-center cursor-pointer overflow-hidden p-2.5 gap-3 border-border/50 min-w-0 w-full",
        "transition-colors duration-150",
        selected
          ? "ring-2 ring-primary bg-primary/5 border-primary/40"
          : "shadow-sm hover:bg-muted/30 hover:border-border",
      )}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={cardLabel}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="relative h-14 w-[42px] shrink-0 overflow-hidden rounded-sm bg-muted/40 shadow-sm">
        <DocumentImage document={document} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-display font-medium leading-tight truncate text-sm min-w-0"
            title={metadata.title || undefined}
          >
            {metadata.title || t("untitled")}
          </span>
          <FormatBadge doctype={metadata.doctype} />
          {metadata.filetype && (
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {metadata.filetype}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground line-clamp-1 mt-0.5">
          <span className="italic truncate">
            {metadata.authors && metadata.authors.length > 0
              ? metadata.authors.join(", ")
              : t("unknownAuthor")}
          </span>
          {showPublisher && (
            <>
              <span className="opacity-40 shrink-0">·</span>
              <span className="truncate">{metadata.publisher}</span>
            </>
          )}
          {metadata.publication_year ? (
            <>
              <span className="opacity-40 shrink-0">·</span>
              <span className="tabular-nums shrink-0">{metadata.publication_year}</span>
            </>
          ) : null}
          {pageCount ? (
            <>
              <span className="opacity-40">·</span>
              <span className="tabular-nums shrink-0">{t("pages", { count: pageCount })}</span>
            </>
          ) : null}
        </div>
        {metadata.keywords && metadata.keywords.length > 0 ? (
          <div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden">
            {metadata.keywords.slice(0, 4).map((kw) => (
              <span
                key={kw}
                className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {kw}
              </span>
            ))}
            {metadata.keywords.length > 4 && (
              <span className="shrink-0 text-[10px] text-muted-foreground/60">
                +{metadata.keywords.length - 4}
              </span>
            )}
          </div>
        ) : null}
      </div>
      {favoriteSlot && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton
            active={!!metadata.favorite}
            onClick={handleFavoriteClick}
            label={tActions("favoriteLabel")}
          />
        </div>
      )}
      {selectionCheckbox}
      {!selectionMode && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <OpenButton
            onClick={handleOpenClick}
            label={tActions("openLabel")}
            className="h-7 w-7"
          />
        </div>
      )}
    </Card>
  );
};
