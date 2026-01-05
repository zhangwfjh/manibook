import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadIcon, HeartIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentListProps {
  documents: LibraryDocument[];
  onClick?: (document: LibraryDocument) => void;
  onDownload?: (document: LibraryDocument) => void;
  onFavoriteToggle?: (document: LibraryDocument) => void;
}

export function DocumentList({ documents, onClick, onDownload, onFavoriteToggle }: DocumentListProps) {
  const handleRowClick = (document: LibraryDocument) => {
    onClick?.(document);
  };

  const handleDownloadClick = (e: React.MouseEvent, document: LibraryDocument) => {
    e.stopPropagation(); // Prevent row click
    onDownload?.(document);
  };

  const handleFavoriteToggleClick = (e: React.MouseEvent, document: LibraryDocument) => {
    e.stopPropagation(); // Prevent row click
    onFavoriteToggle?.(document);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Authors</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Pages</TableHead>
            {/* <TableHead>Keywords</TableHead>
            <TableHead>Category</TableHead> */}
            <TableHead className="w-25">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document, index) => (
            <TableRow
              key={index}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(document)}
            >
              <TableCell className="font-medium max-w-xs">
                <div className="truncate" title={document.metadata.title}>
                  {document.metadata.title}
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={document.metadata.authors?.join(', ')}>
                  {document.metadata.authors?.join(', ') || '-'}
                </div>
              </TableCell>
              <TableCell>
                {document.metadata.publication_year || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={document.metadata.doctype === 'Book' ? 'default' : 'secondary'}>
                  {document.metadata.doctype}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={document.metadata.publisher}>
                  {document.metadata.publisher || '-'}
                </div>
              </TableCell>
              <TableCell>
                {document.metadata.language || '-'}
              </TableCell>
              <TableCell>
                {document.metadata.numPages || '-'}
              </TableCell>
              {/* <TableCell className="max-w-xs">
                <div className="flex flex-wrap gap-1">
                  {document.metadata.keywords?.slice(0, 1).map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                  {document.metadata.keywords && document.metadata.keywords.length > 1 && (
                    <Badge variant="outline" className="text-xs">
                      +{document.metadata.keywords.length - 1}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={document.metadata.category}>
                  {document.metadata.category || '-'}
                </div>
              </TableCell> */}
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleFavoriteToggleClick(e, document)}
                    className={document.metadata.favorite ? "text-red-500" : "text-muted-foreground hover:text-red-500"}
                  >
                    <HeartIcon className={`h-4 w-4 ${document.metadata.favorite ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDownloadClick(e, document)}
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
