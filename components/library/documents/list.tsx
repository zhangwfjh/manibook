import React, { useRef } from "react";
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
import { formatFileSize, LibraryDocument } from "@/lib/library";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DocumentRow } from "./document-row";
import { DocumentListProps } from "../types";

export const DocumentList = ({
  documents,
  onClick,
  onOpen,
  onFavoriteToggle,
  onDelete,
  selectionMode = false,
  selectedDocuments = new Set(),
  onToggleSelection,
  useVirtualization: useVirtualizationProp,
}: DocumentListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirtualization =
    useVirtualizationProp !== undefined
      ? useVirtualizationProp
      : documents.length > 50;

  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const handleRowClick = (document: LibraryDocument) => {
    if (selectionMode) {
      onToggleSelection?.(document.id);
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
    document: LibraryDocument,
  ) => {
    e.stopPropagation();
    onFavoriteToggle?.(document);
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    document: LibraryDocument,
  ) => {
    e.stopPropagation();
    onDelete?.(document);
  };

  const handleSelectAll = () => {
    const allSelected = documents.every((doc) => selectedDocuments.has(doc.id));
    if (allSelected) {
      documents.forEach((doc) => onToggleSelection?.(doc.id));
    } else {
      documents.forEach((doc) => {
        if (!selectedDocuments.has(doc.id)) {
          onToggleSelection?.(doc.id);
        }
      });
    }
  };

  const allSelected =
    documents.length > 0 &&
    documents.every((doc) => selectedDocuments.has(doc.id));

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No documents found
      </div>
    );
  }

  const tableHeader = (
    <TableHeader>
      <TableRow>
        {selectionMode && (
          <TableHead className="w-12">
            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
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
  );

  if (useVirtualization) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center border-b px-4 py-2 bg-muted/50 text-sm font-medium">
          {selectionMode && (
            <div className="w-10 shrink-0">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">Title</div>
          <div className="w-20 shrink-0">Year</div>
          <div className="w-24 shrink-0">Type</div>
          <div className="flex-1 min-w-0">Publisher</div>
          <div className="w-20 shrink-0">Language</div>
          <div className="w-16 shrink-0">Pages</div>
          <div className="w-16 shrink-0">Format</div>
          <div className="w-20 shrink-0">Size</div>
          {!selectionMode && <div className="w-16 shrink-0">Actions</div>}
        </div>
        <div
          ref={parentRef}
          style={{
            height: `${Math.min(600, virtualizer.getTotalSize())}px`,
            overflow: "auto",
          }}
          className="border rounded-md"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualRows.map((virtualRow) => (
              <DocumentRow
                key={virtualRow.key}
                document={documents[virtualRow.index]}
                selectionMode={selectionMode}
                selectedDocuments={selectedDocuments}
                onToggleSelection={onToggleSelection}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        {tableHeader}
        <TableBody>
          {documents.map((document, index) => (
            <TableRow
              key={index}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedDocuments.has(document.id) ? "bg-muted" : ""
              }`}
              onClick={() => handleRowClick(document)}
            >
              {selectionMode && (
                <TableCell>
                  <Checkbox
                    checked={selectedDocuments.has(document.id)}
                    onCheckedChange={() => onToggleSelection?.(document.id)}
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
                <Badge variant="secondary">{document.metadata.doctype}</Badge>
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
