"use client";

import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Metadata } from "@/lib/library";

interface DialogAbstractSectionProps {
  metadata: Metadata;
  isEditing: boolean;
  editedMetadata: Metadata | null;
  onChange: (metadata: Metadata) => void;
}

export function AbstractSection({
  metadata,
  isEditing,
  editedMetadata,
  onChange,
}: DialogAbstractSectionProps) {
  const t = useTranslations("detailSections");

  const handleChange = (value: string) => {
    onChange({
      ...editedMetadata,
      abstract: value,
    } as Metadata);
  };

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("abstract.title")}
      </h3>
      {isEditing ? (
        <Textarea
          id="abstract"
          value={editedMetadata?.abstract || ""}
          onChange={(e) => handleChange(e.target.value)}
          className="mt-2 min-h-28"
          placeholder={t("abstract.placeholder")}
        />
      ) : (
        <div className="mt-2">
          {metadata.abstract ? (
            <blockquote className="border-l-2 border-primary/40 pl-4 text-[0.95rem] leading-relaxed text-foreground/85">
              {metadata.abstract}
            </blockquote>
          ) : (
            <p className="text-sm italic text-muted-foreground/70">
              {t("abstract.noAbstract")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
