import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import { UsersIcon } from "lucide-react";
import { Metadata as MetadataType } from "@/lib/library";

interface MetadataProps {
  metadata: MetadataType;
  showYear?: boolean;
  showDoctype?: boolean;
  showCategory?: boolean;
  compact?: boolean;
}

export function DocumentMetadata({
  metadata,
  showYear = false,
  showDoctype = false,
  showCategory = false,
  compact = false,
}: MetadataProps) {
  const titleClass = compact
    ? "font-medium max-w-xs truncate"
    : "text-lg leading-tight line-clamp-2";
  const authorsClass = compact
    ? "text-sm text-muted-foreground max-w-xs truncate"
    : "flex items-center gap-1 text-sm text-muted-foreground mt-1";

  return (
    <>
      <div className="flex-1">
        <CardTitle className={titleClass} title={metadata.title}>
          {metadata.title ? metadata.title : "Untitled"}
        </CardTitle>
        <div className={authorsClass}>
          {compact ? (
            metadata.authors?.join(", ") || "-"
          ) : (
            <>
              <UsersIcon className="h-4 w-4" />
              <span className="line-clamp-1">
                {metadata.authors && metadata.authors.length > 0
                  ? metadata.authors.join(", ")
                  : "Unknown"}
              </span>
            </>
          )}
        </div>
      </div>
      {showYear && (
        <div className="text-sm text-muted-foreground shrink-0">
          {metadata.publication_year || "-"}
        </div>
      )}
      {showDoctype && (
        <div className="shrink-0">
          <Badge variant="secondary" className="text-xs">
            {metadata.doctype}
          </Badge>
        </div>
      )}
      {showCategory && (
        <Badge variant="outline" className="text-xs">
          {metadata.category}
        </Badge>
      )}
    </>
  );
}
