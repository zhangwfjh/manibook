import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DocumentCard } from "@/components/library/document-card";
import { DocumentList } from "@/components/library/document-list";
import { LibraryDocument } from "@/lib/library";

type ViewMode = "card" | "list";

interface LibraryContentProps {
  currentLibrary: string;
  selectedCategory: string;
  sortedDocuments: LibraryDocument[];
  viewMode: ViewMode;
  onDocumentClick: (document: LibraryDocument) => void;
  onDownload: (doc: LibraryDocument) => void;
  onFavoriteToggle: (document: LibraryDocument) => void;
  onBreadcrumbClick: (category: string) => void;
}

export function LibraryContent({
  currentLibrary,
  selectedCategory,
  sortedDocuments,
  viewMode,
  onDocumentClick,
  onDownload,
  onFavoriteToggle,
  onBreadcrumbClick,
}: LibraryContentProps) {
  return (
    <div className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <div className="mb-4 flex flex-row justify-between">
        {currentLibrary && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>Location:</BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onBreadcrumbClick("");
                  }}
                >
                  {currentLibrary}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {selectedCategory &&
                selectedCategory
                  .split(" > ")
                  .map((part, index, array) => (
                    <React.Fragment key={index}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {index === array.length - 1 ? (
                          <BreadcrumbPage>{part}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              const newCategory = array
                                .slice(0, index + 1)
                                .join(" > ");
                              onBreadcrumbClick(newCategory);
                            }}
                          >
                            {part}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Document count */}
        <p className="text-sm text-muted-foreground">
          {sortedDocuments.length} document
          {sortedDocuments.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {sortedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">No documents found</p>
            <p>Try adjusting your search or category filter.</p>
          </div>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedDocuments.map((document) => (
            <DocumentCard
              key={`${currentLibrary}-${document.filename}`}
              library={currentLibrary}
              document={document}
              onClick={onDocumentClick}
              onDownload={onDownload}
              onFavoriteToggle={onFavoriteToggle}
            />
          ))}
        </div>
      ) : (
        <DocumentList
          documents={sortedDocuments}
          onClick={onDocumentClick}
          onDownload={onDownload}
          onFavoriteToggle={onFavoriteToggle}
        />
      )}
    </div>
  );
}
