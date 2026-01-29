import React, { useMemo, memo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarIcon } from "lucide-react";
import { formatFileSize, getFormatIcon } from "@/lib/library";
import { DocumentMetadata } from "./metadata";
import { DocumentActions } from "./document-actions";
import { DocumentImage } from "./document-image";
import { DocumentDisplayProps } from "../types";

const DocumentCardComponent = ({
  document,
  onClick,
  onOpen,
  onFavoriteToggle,
  onDelete,
  selectionMode = false,
  onToggleSelection,
  selected,
}: DocumentDisplayProps) => {
  const { metadata } = document;

  const formattedFileSize = useMemo(
    () => (metadata.filesize ? formatFileSize(metadata.filesize) : null),
    [metadata.filesize],
  );

  const formatIcon = useMemo(
    () => (metadata.format ? getFormatIcon(metadata.format) : null),
    [metadata.format],
  );

  const handleCardClick = useCallback(() => {
    if (selectionMode) {
      onToggleSelection?.(document.id);
    } else {
      onClick?.(document);
    }
  }, [onClick, document, selectionMode, onToggleSelection]);

  return (
    <Card
      className={`group w-full h-full flex flex-row hover:shadow-lg transition-shadow duration-200 cursor-pointer border-border/50 hover:border-border ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      onClick={handleCardClick}
    >
      <div className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <DocumentMetadata metadata={metadata} />
            <DocumentActions
              document={document}
              onOpen={onOpen}
              onFavoriteToggle={onFavoriteToggle}
              onDelete={onDelete}
            />
          </div>
          <div className="flex gap-5">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {metadata.publicationYear ? metadata.publicationYear : "?"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {React.createElement(formatIcon!, {
                className: "h-4 w-4",
              })}
              <span>{formattedFileSize}</span>
            </div>

            <div className="text-sm">
              <Badge variant="outline" className="text-xs">
                {metadata.category}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-row gap-4 justify-between">
          <div className="flex flex-col justify-between space-y-4">
            {metadata.abstract ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-muted-foreground line-clamp-8 cursor-help">
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
              <p className="text-sm text-muted-foreground line-clamp-8 cursor-help">
                No description
              </p>
            )}

            {metadata.keywords && metadata.keywords.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-wrap gap-1 cursor-help">
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
                    <div className="font-medium mb-2">All Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {metadata.keywords.map((keyword, index) => (
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

export const DocumentCard = memo(DocumentCardComponent);
