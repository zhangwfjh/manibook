import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";

interface DocumentListProps {
  documents: LibraryDocument[];
  onClick?: (document: LibraryDocument) => void;
  onDownload?: (document: LibraryDocument) => void;
}

export function DocumentList({ documents, onClick, onDownload }: DocumentListProps) {
  const handleRowClick = (document: LibraryDocument) => {
    onClick?.(document);
  };

  const handleDownloadClick = (e: React.MouseEvent, document: LibraryDocument) => {
    e.stopPropagation(); // Prevent row click
    onDownload?.(document);
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
            <TableHead>Category</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
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
                <div className="truncate" title={document.metadata.category}>
                  {document.metadata.category || '-'}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDownloadClick(e, document)}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
