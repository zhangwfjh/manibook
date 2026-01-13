import React, { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HeartIcon, BookOpenIcon, TrashIcon } from "lucide-react";
import { LibraryDocument } from "@/lib/library";
import { formatFileSize } from "@/lib/library/document-utils";

interface DocumentListProps {
  documents: LibraryDocument[];
  onClick?: (document: LibraryDocument) => void;
  onOpen?: (document: LibraryDocument) => void;
  onFavoriteToggle?: (document: LibraryDocument) => void;
  onDelete?: (document: LibraryDocument) => void;
  selectionMode?: boolean;
  selectedDocuments?: Set<string>;
  onToggleDocumentSelection?: (documentId: string) => void;
}

const DocumentListComponent = ({
  documents,
  onClick,
  onOpen,
  onFavoriteToggle,
  onDelete,
  selectionMode = false,
  selectedDocuments = new Set(),
  onToggleDocumentSelection,
}: DocumentListProps) => {
  const handleRowClick = (document: LibraryDocument) => {
    if (selectionMode) {
      onToggleDocumentSelection?.(document.id);
    } else {
      onClick?.(document);
    }
  };

  const handleOpenClick = (e: React.MouseEvent, document: LibraryDocument) => {
    e.stopPropagation();
    onOpen?.(document);
  };

  const handleFavoriteToggleClick = (
    e: React.MouseEvent,
    document: LibraryDocument
  ) => {
    e.stopPropagation(); // Prevent row click
    onFavoriteToggle?.(document);
  };

  const handleDeleteClick = (e: React.MouseEvent, document: LibraryDocument) => {
    e.stopPropagation(); // Prevent row click
    onDelete?.(document);
  };

  const handleSelectAll = () => {
    const allSelected = documents.every(doc => selectedDocuments.has(doc.id));
    if (allSelected) {
      documents.forEach(doc => onToggleDocumentSelection?.(doc.id));
    } else {
      documents.forEach(doc => {
        if (!selectedDocuments.has(doc.id)) {
          onToggleDocumentSelection?.(doc.id);
        }
      });
    }
  };

  const allSelected = documents.length > 0 && documents.every(doc => selectedDocuments.has(doc.id));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionMode && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Title</TableHead>
            <TableHead>Authors</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>File Size</TableHead>
            {!selectionMode && <TableHead className="w-25">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document, index) => (
            <TableRow
              key={index}
              className={`cursor-pointer hover:bg-muted/50 ${selectedDocuments.has(document.id) ? 'bg-muted' : ''}`}
              onClick={() => handleRowClick(document)}
            >
              {selectionMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedDocuments.has(document.id)}
                    onCheckedChange={() => onToggleDocumentSelection?.(document.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium max-w-xs">
                <div className="truncate" title={document.metadata.title}>
                  {document.metadata.title}
                </div>
              </TableCell>
              <TableCell className="max-w-xs">
                <div
                  className="truncate"
                  title={document.metadata.authors?.join(", ")}
                >
                  {document.metadata.authors?.join(", ") || "-"}
                </div>
              </TableCell>
              <TableCell>{document.metadata.publicationYear || "-"}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {document.metadata.doctype}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={document.metadata.publisher}>
                  {document.metadata.publisher || "-"}
                </div>
              </TableCell>
              <TableCell>{document.metadata.language || "-"}</TableCell>
              <TableCell>{document.metadata.numPages || "-"}</TableCell>
              <TableCell>
                {document.metadata.format?.toUpperCase() || "-"}
              </TableCell>
              <TableCell>
                {document.metadata.filesize
                  ? formatFileSize(document.metadata.filesize)
                  : "-"}
              </TableCell>
              {!selectionMode && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleOpenClick(e, document)}
                    >
                      <BookOpenIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleFavoriteToggleClick(e, document)}
                      className={
                        document.metadata.favorite
                          ? "text-red-500"
                          : "text-muted-foreground hover:text-red-500"
                      }
                    >
                      <HeartIcon
                        className={`h-4 w-4 ${
                          document.metadata.favorite ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, document)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const DocumentList = memo(DocumentListComponent);
