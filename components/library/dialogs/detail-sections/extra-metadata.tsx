"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { Metadata } from "@/lib/library";

interface DialogExtraMetadataProps {
  metadata: Metadata;
  isEditing: boolean;
  editedMetadata: Metadata | null;
  onChange: (metadata: Metadata) => void;
}

export function ExtraMetadata({
  metadata,
  isEditing,
  editedMetadata,
  onChange,
}: DialogExtraMetadataProps) {
  const handleFieldChange = (key: string, value: string) => {
    const currentMetadata = editedMetadata?.metadata || {};
    const newMetadata = { ...currentMetadata, [key]: value };
    onChange({
      ...editedMetadata,
      metadata: newMetadata,
    } as Metadata);
  };

  const handleFieldRemove = (key: string) => {
    const currentMetadata = editedMetadata?.metadata || {};
    const newMetadata = { ...currentMetadata };
    delete newMetadata[key];
    onChange({
      ...editedMetadata,
      metadata: newMetadata,
    } as Metadata);
  };

  const handleFieldAdd = () => {
    const currentMetadata = editedMetadata?.metadata || {};
    const newKey = `field_${Object.keys(currentMetadata).length + 1}`;
    const newMetadata = { ...currentMetadata, [newKey]: "" };
    onChange({
      ...editedMetadata,
      metadata: newMetadata,
    } as Metadata);
  };

  return (
    <Card className="max-w-full">
      <CardContent>
        <Label className="text-sm font-medium text-muted-foreground">
          ADDITIONAL METADATA
        </Label>
        {isEditing ? (
          <div className="mt-1 space-y-2">
            {editedMetadata?.metadata &&
            Object.keys(editedMetadata.metadata).length > 0 ? (
              Object.entries(editedMetadata.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-center">
                  <Input
                    placeholder="Key"
                    value={key}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      const currentMetadata = editedMetadata?.metadata || {};
                      const newMetadata = { ...currentMetadata };
                      delete newMetadata[key];
                      newMetadata[newKey] = value;
                      onChange({
                        ...editedMetadata,
                        metadata: newMetadata,
                      } as Metadata);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={
                      Array.isArray(value) ? value.join(", ") : String(value)
                    }
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleFieldRemove(key)}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No additional metadata
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFieldAdd}
            >
              Add Field
            </Button>
          </div>
        ) : (
          <div className="mt-1">
            {metadata.metadata && Object.keys(metadata.metadata).length > 0 ? (
              <div className="space-y-1 text-sm bg-muted/50 p-4 rounded-md">
                {Object.entries(metadata.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="ml-2 text-right">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">
                No additional metadata
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
