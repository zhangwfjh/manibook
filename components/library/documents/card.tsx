import React, { useMemo, memo, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { UsersIcon, CalendarIcon, HeartIcon, BookOpenIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";
import {
  formatFileSize,
  getFormatIcon,
  getCoverUrl,
} from "@/lib/library/document-utils";
import { useImageLoading } from "@/hooks/use-image-loading";

interface DocumentCardProps {
  library: string;
  document: LibraryDocument;
  onClick?: (document: LibraryDocument) => void;
  onOpen?: (document: LibraryDocument) => void;
  onFavoriteToggle?: (document: LibraryDocument) => void;
}

const DocumentCardComponent = ({
  library,
  document,
  onClick,
  onOpen,
  onFavoriteToggle,
}: DocumentCardProps) => {
  const { metadata } = document;

  // Memoize expensive computations
  const coverUrl = useMemo(
    () => getCoverUrl(library, document),
    [library, document]
  );

  const formattedFileSize = useMemo(
    () => (metadata.filesize ? formatFileSize(metadata.filesize) : null),
    [metadata.filesize]
  );

  const formatIcon = useMemo(
    () => (metadata.format ? getFormatIcon(metadata.format) : null),
    [metadata.format]
  );

  const handleOpenClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpen?.(document);
    },
    [onOpen, document]
  );

  const handleCardClick = useCallback(() => {
    onClick?.(document);
  }, [onClick, document]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFavoriteToggle?.(document);
    },
    [onFavoriteToggle, document]
  );

  // Lazy load images with intersection observer
  const { isLoaded, hasError, observeImage, handleLoad, handleError } =
    useImageLoading();
  const imageRef = useCallback(
    (img: HTMLImageElement) => {
      observeImage(img, coverUrl);
      if (!isLoaded(coverUrl) && !hasError(coverUrl)) {
        handleLoad(coverUrl);
      }
    },
    [coverUrl, isLoaded, hasError, observeImage, handleLoad]
  );

  return (
    <Card
      className="group w-full h-full flex flex-row hover:shadow-lg transition-shadow duration-200 cursor-pointer border-border/50 hover:border-border"
      onClick={handleCardClick}
    >
      <div className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight line-clamp-2">
                {metadata.title ? metadata.title : "Untitled"}
              </CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <UsersIcon className="h-4 w-4" />
                <span className="line-clamp-1">
                  {metadata.authors && metadata.authors.length > 0
                    ? metadata.authors.join(", ")
                    : "Unknown"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenClick}
                className="h-6 w-6 p-0"
              >
                <BookOpenIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                className={`h-6 w-6 p-0 ${
                  metadata.favorite
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
              >
                <HeartIcon
                  className={`h-4 w-4 ${
                    metadata.favorite ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Badge variant="secondary">{metadata.doctype}</Badge>
            </div>
          </div>
          <div className="flex gap-5">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {metadata.publicationYear
                  ? metadata.publicationYear
                  : "?"}
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
          <div className="space-y-4">
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
                    {metadata.keywords.slice(0, 5).map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {metadata.keywords.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{metadata.keywords.length - 5}
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

          <div className="shrink-0">
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="cursor-pointer">
                  <div className="bg-muted/50 blur-sm rounded animate-pulse" />
                  <Image
                    ref={imageRef}
                    src={coverUrl}
                    alt={`${metadata.title} cover`}
                    width={150}
                    height={200}
                    className="object-cover rounded border shadow-sm hover:shadow-md transition-opacity duration-200"
                    loading="lazy"
                    unoptimized
                    onLoad={() => handleLoad(coverUrl)}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      handleError(coverUrl);
                    }}
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent
                className="w-auto p-0 border-0 shadow-2xl"
                side="right"
                align="start"
              >
                <Image
                  src={coverUrl}
                  alt={`${metadata.title} cover`}
                  width={480}
                  height={640}
                  className="object-cover rounded border shadow-lg"
                  loading="eager"
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </HoverCardContent>
            </HoverCard>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export const DocumentCard = memo(DocumentCardComponent);
