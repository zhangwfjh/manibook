"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Metadata } from "@/lib/library";
import {
  UsersIcon,
  CalendarIcon,
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
} from "lucide-react";

interface DialogMetadataViewProps {
  metadata: Metadata;
}

export function MetadataView({ metadata }: DialogMetadataViewProps) {
  const t = useTranslations("detailSections");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.title")}
          </Label>
          <div className="mt-1 text-lg">
            {metadata.title ? metadata.title : t("metadataView.untitled")}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.authors")}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {metadata.authors && metadata.authors.length > 0
                ? metadata.authors.join(", ")
                : t("metadataView.unknown")}
            </span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.publicationYear")}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{metadata.publication_year || t("metadataView.unknown")}</span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.publisher")}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
            <span>{metadata.publisher || t("metadataView.unknown")}</span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.language")}
          </Label>
          <span className="mt-1 block text-sm">
            {metadata.language || t("metadataView.unknown")}
          </span>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.pages")}
          </Label>
          {metadata.page_count && (
            <div className="flex items-center gap-2 mt-1">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <span>{metadata.page_count}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.documentType")}
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              <BookOpenIcon className="h-3 w-3 mr-1" />
              {metadata.doctype}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.category")}
          </Label>
          {metadata.category && (
            <div className="mt-1">
              <Badge variant="outline">
                <FileTextIcon className="h-3 w-3 mr-1" />
                {metadata.category}
              </Badge>
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            {t("metadata.keywords")}
          </Label>
          <div className="mt-1">
            {metadata.keywords && metadata.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metadata.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">{t("metadataView.noKeywords")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
