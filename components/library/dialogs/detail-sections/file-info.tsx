"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Document, formatFileSize, getFormatIcon } from "@/lib/library";

interface DialogFileInfoProps {
  document: Document;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-sm">{children}</dd>
    </div>
  );
}

export function FileInfo({ document }: DialogFileInfoProps) {
  const t = useTranslations("detailSections");
  const { metadata } = document;
  const hasFormat = !!metadata.filetype;

  return (
    <section className="rounded-lg border bg-card/50">
      <div className="border-b px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("fileInfo.title")}
        </h3>
      </div>
      <dl className="divide-y divide-border/60 px-4">
        <Row label={t("fileInfo.filename")}>
          {document.url.split("/").pop()}
        </Row>
        <Row label={t("fileInfo.filePath")}>{document.url}</Row>
        <Row label={t("fileInfo.fileSize")}>
          <span className="inline-flex items-center gap-2">
            {hasFormat && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {React.createElement(getFormatIcon(metadata.filetype!), {
                    className: "h-4 w-4 shrink-0 text-muted-foreground",
                  })}
                </TooltipTrigger>
                <TooltipContent>
                  {t("fileInfo.fileFormat", {
                    format: metadata.filetype?.toUpperCase(),
                  })}
                </TooltipContent>
              </Tooltip>
            )}
            {metadata.filesize ? formatFileSize(metadata.filesize) : "—"}
          </span>
        </Row>
        <Row label={t("fileInfo.format")}>
          {metadata.filetype ? (
            <span className="font-mono uppercase">{metadata.filetype}</span>
          ) : (
            "—"
          )}
        </Row>
      </dl>
    </section>
  );
}
