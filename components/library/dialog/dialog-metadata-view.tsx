import React from "react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DocumentMetadata } from "@/lib/library";
import {
  UsersIcon,
  CalendarIcon,
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
} from "lucide-react";

interface DialogMetadataViewProps {
  metadata: DocumentMetadata;
}

function DialogMetadataViewComponent({ metadata }: DialogMetadataViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            TITLE
          </Label>
          <div className="mt-1 text-lg font-semibold">{metadata.title}</div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            AUTHORS
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              {metadata.authors && metadata.authors.length > 0
                ? metadata.authors.join(", ")
                : "Not specified"}
            </span>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            PUBLICATION YEAR
          </Label>
          {metadata.publicationYear && (
            <div className="flex items-center gap-2 mt-1">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{metadata.publicationYear}</span>
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            PUBLISHER
          </Label>
          {metadata.publisher && (
            <div className="flex items-center gap-2 mt-1">
              <GlobeIcon className="h-4 w-4 text-muted-foreground" />
              <span>{metadata.publisher}</span>
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            LANGUAGE
          </Label>
          <span className="mt-1 block text-sm">
            {metadata.language || "Not specified"}
          </span>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            PAGES
          </Label>
          {metadata.numPages && (
            <div className="flex items-center gap-2 mt-1">
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
              <span>{metadata.numPages}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            DOCUMENT TYPE
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={metadata.doctype === "Book" ? "default" : "secondary"}
            >
              <BookOpenIcon className="h-3 w-3 mr-1" />
              {metadata.doctype}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">
            CATEGORY
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
            KEYWORDS
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
              <span className="text-muted-foreground">No keywords</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const DialogMetadataView = React.memo(DialogMetadataViewComponent);
DialogMetadataView.displayName = "DialogMetadataView";
