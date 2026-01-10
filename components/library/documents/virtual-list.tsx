import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DocumentRow } from "./document-row";
import { LibraryDocument } from "@/lib/library";

interface VirtualDocumentListProps {
  documents: LibraryDocument[];
  onClick: (document: LibraryDocument) => void;
  onDownload: (document: LibraryDocument) => void;
  onFavoriteToggle: (document: LibraryDocument) => void;
}

function VirtualDocumentListComponent({
  documents,
  onClick,
  onDownload,
  onFavoriteToggle,
}: VirtualDocumentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const virtualRows = useMemo(
    () => virtualizer.getVirtualItems(),
    [virtualizer]
  );

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No documents found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center border-b px-4 py-2 bg-muted/50 text-sm font-medium">
        <div className="flex-1 min-w-0">Title</div>
        <div className="w-20 shrink-0">Year</div>
        <div className="w-24 shrink-0">Type</div>
        <div className="flex-1 min-w-0">Publisher</div>
        <div className="w-20 shrink-0">Language</div>
        <div className="w-16 shrink-0">Pages</div>
        <div className="w-16 shrink-0">Format</div>
        <div className="w-20 shrink-0">Size</div>
        <div className="w-16 shrink-0">Actions</div>
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
              onClick={onClick}
              onDownload={onDownload}
              onFavoriteToggle={onFavoriteToggle}
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

export const VirtualList = VirtualDocumentListComponent;
