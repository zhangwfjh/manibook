"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Document, formatFileSize, getFormatIcon } from "@/lib/library";
import { DocumentMetadata } from "./metadata";
import { DocumentActions } from "./document-actions";
import { DocumentImage } from "./document-image";
import { useLibraryUIStore } from "@/stores";

export const DocumentCard = ({ document }: { document: Document }) => {
  const t = useTranslations("features.documentCard");
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

  const { metadata } = document;

  const formattedFileSize = metadata.filesize
    ? formatFileSize(metadata.filesize)
    : null;

  const formatIcon = metadata.filetype ? getFormatIcon(metadata.filetype) : null;

  const titleForLabel = metadata.title || t("untitled");

  const handleCardClick = () => {
    handleDocumentClick(document, selectionMode);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDocumentClick(document, selectionMode);
    }
  };

  const cardLabel = selectionMode
    ? t("selectLabel", { title: titleForLabel })
    : t("openLabel", { title: titleForLabel });

  return (
    <Card
      className={cn(
        "group w-full h-full flex flex-row cursor-pointer border-border/50 transition-all duration-200",
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
      <div className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <DocumentMetadata metadata={metadata} />
            {selectionMode ? (
              // Selection checkbox replaces inline actions; stopPropagation so
              // clicking it doesn't also trigger the card's toggle (double fire).
              <div
                className="flex items-center gap-2 shrink-0 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() =>
                    toggleDocumentSelection(document.id)
                  }
                  aria-label={t("selectLabel", { title: titleForLabel })}
                />
              </div>
            ) : (
              // Subtle until hover/focus, never fully hidden (touch-friendly).
              <div className="flex items-center gap-1 shrink-0 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <DocumentActions document={document} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {metadata.publication_year
                  ? metadata.publication_year
                  : t("missingYear")}
              </span>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {formatIcon &&
                React.createElement(formatIcon, { className: "h-4 w-4" })}
              {formattedFileSize && <span>{formattedFileSize}</span>}
            </div>

            {metadata.doctype && (
              <Badge variant="outline" className="text-xs">
                {metadata.doctype}
              </Badge>
            )}

            {metadata.category && (
              <Badge variant="outline" className="text-xs">
                {metadata.category}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-row gap-4 justify-between">
          <div className="flex flex-col justify-between space-y-4 min-w-0">
            {metadata.abstract ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-muted-foreground line-clamp-3 cursor-help">
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
              <p className="text-sm text-muted-foreground line-clamp-3">
                {t("noDescription")}
              </p>
            )}

            {metadata.keywords && metadata.keywords.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-wrap gap-1">
                    {metadata.keywords.slice(0, 4).map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {metadata.keywords.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{metadata.keywords.length - 4}
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="text-sm">
                    <div className="font-medium mb-2">{t("allKeywords")}</div>
                    <div className="flex flex-wrap gap-1">
                      {metadata.keywords.map((keyword: string, index: number) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <DocumentImage document={document} />
        </CardContent>
      </div>
    </Card>
  );
};
