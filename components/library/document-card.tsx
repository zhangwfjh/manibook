import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpenIcon, DownloadIcon, UsersIcon, CalendarIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentCardProps {
  document: LibraryDocument;
  onClick?: (document: LibraryDocument) => void;
  onDownload?: (document: LibraryDocument) => void;
}

export function DocumentCard({ document, onClick, onDownload }: DocumentCardProps) {
  const { metadata } = document;

  const handleCardClick = () => {
    onClick?.(document);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onDownload?.(document);
  };

  return (
    <Card
      className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {metadata.title}
          </CardTitle>
          <Badge variant={metadata.doctype === 'Book' ? 'default' : 'secondary'}>
            {metadata.doctype}
          </Badge>
        </div>
        {metadata.authors && metadata.authors.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <UsersIcon className="h-4 w-4" />
            <span className="line-clamp-1">
              {metadata.authors.join(', ')}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-2">
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

          {metadata.abstract && (
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
          )}

          {metadata.keywords && metadata.keywords.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-wrap gap-1 cursor-help">
                  {metadata.keywords.slice(0, 3).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {metadata.keywords.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{metadata.keywords.length - 3}
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="text-sm">
                  <div className="font-medium mb-2">All Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {metadata.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleDownloadClick}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
