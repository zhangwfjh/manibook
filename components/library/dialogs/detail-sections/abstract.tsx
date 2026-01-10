import React, { memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DocumentMetadata } from "@/lib/library";

interface DialogAbstractSectionProps {
  metadata: DocumentMetadata;
  isEditing: boolean;
  editedMetadata: DocumentMetadata | null;
  onChange: (metadata: DocumentMetadata) => void;
}

function DialogAbstractSectionComponent({
  metadata,
  isEditing,
  editedMetadata,
  onChange,
}: DialogAbstractSectionProps) {
  const handleChange = useCallback(
    (value: string) => {
      onChange({
        ...editedMetadata,
        abstract: value,
      } as DocumentMetadata);
    },
    [editedMetadata, onChange]
  );

  return (
    <Card className="max-w-full">
      <CardContent>
        <Label
          htmlFor="abstract"
          className="text-sm font-medium text-muted-foreground"
        >
          ABSTRACT
        </Label>
        {isEditing ? (
          <Textarea
            id="abstract"
            value={editedMetadata?.abstract || ""}
            onChange={(e) => handleChange(e.target.value)}
            className="mt-1 min-h-25"
            placeholder="Document abstract or summary..."
          />
        ) : (
          <div className="mt-1">
            {metadata.abstract ? (
              <div className="text-sm leading-relaxed bg-muted/50 p-4 rounded-md">
                {metadata.abstract}
              </div>
            ) : (
              <span className="text-muted-foreground">No abstract</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const AbstractSection = memo(DialogAbstractSectionComponent);
AbstractSection.displayName = "AbstractSection";
