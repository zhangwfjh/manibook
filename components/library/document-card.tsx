import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpenIcon,
  DownloadIcon,
  UsersIcon,
  CalendarIcon,
  StarIcon,
} from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentCardProps {
  document: LibraryDocument;
  onClick?: (document: LibraryDocument) => void;
  onDownload?: (document: LibraryDocument) => void;
  onFavoriteToggle?: (document: LibraryDocument) => void;
}

export function DocumentCard({
  document,
  onClick,
  onDownload,
  onFavoriteToggle,
}: DocumentCardProps) {
  const { metadata } = document;

  const handleCardClick = () => {
    onClick?.(document);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onDownload?.(document);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newFavoriteStatus = !metadata.favorite;
    try {
      const response = await fetch(
        `/api/library/favorite?filename=${encodeURIComponent(
          document.filename
        )}&favorite=${newFavoriteStatus}`,
        {
          method: "PATCH",
        }
      );

      if (response.ok) {
        onFavoriteToggle?.(document);
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  return (
    <Card
      className="w-full flex flex-row hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight line-clamp-2">
                {metadata.title}
              </CardTitle>
              {metadata.authors && metadata.authors.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <UsersIcon className="h-4 w-4" />
                  <span className="line-clamp-1">
                    {metadata.authors.join(", ")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteClick}
                className={`h-6 w-6 p-0 ${
                  metadata.favorite
                    ? "text-yellow-500 hover:text-yellow-600"
                    : "text-gray-400 hover:text-yellow-500"
                }`}
              >
                <StarIcon
                  className={`h-4 w-4 ${
                    metadata.favorite ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Badge
                variant={metadata.doctype === "Book" ? "default" : "secondary"}
              >
                {metadata.doctype}
              </Badge>
            </div>
          </div>
          <div className="flex gap-5">
            {metadata.publication_year && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>{metadata.publication_year}</span>
              </div>
            )}

            {metadata.category && (
              <div className="text-sm">
                <Badge variant="outline" className="text-xs">
                  {metadata.category}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-row gap-4">
          <div className="space-y-4">
            {metadata.abstract && (
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
            <Image
              src={document.url.replace(/\/([^\/]+)$/, (match, filename) => {
                const coverFilename = `[Cover] ${filename.replace(/\.(pdf|epub|djvu)$/i, '.jpg')}`;
                return `/${coverFilename}`;
              })}
              alt={`${metadata.title} cover`}
              width={150}
              height={200}
              className="object-cover rounded border shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
