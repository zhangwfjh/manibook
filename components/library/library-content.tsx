import React, { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { DocumentCard } from "@/components/library/document-card";
import { DocumentList } from "@/components/library/document-list";
import { PaginationControls } from "@/components/library/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";
import { LibraryDocument } from "@/lib/library";
import { BookOpenIcon } from "lucide-react";

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
  // Use pagination for both views to improve performance with large document sets
  const itemsPerPage = viewMode === "card" ? 20 : 50; // Show 20 cards per page, 50 rows per page for list view
  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({
    items: sortedDocuments,
    itemsPerPage,
  });

  // Reset to first page when filters/sort change
  useEffect(() => {
    goToPage(1);
  }, [goToPage, selectedCategory, sortedDocuments.length]);

  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Breadcrumb and Document Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                  className="transition-colors hover:text-foreground"
                >
                  {currentLibrary}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {selectedCategory &&
                selectedCategory.split(" > ").map((part, index, array) => (
                  <React.Fragment key={index}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {index === array.length - 1 ? (
                        <BreadcrumbPage className="font-medium">
                          {part}
                        </BreadcrumbPage>
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
                          className="transition-colors hover:text-foreground"
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <span className="font-medium text-foreground">
            {sortedDocuments.length}
          </span>
          <span>document{sortedDocuments.length !== 1 ? "s" : ""} found</span>
        </div>
      </div>

      {sortedDocuments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>No documents found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search query, category filter, or upload some
              documents to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "card" ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-6 animate-in fade-in-0 duration-500">
            {paginatedItems.map((document, index) => (
              <div
                key={`${currentLibrary}-${document.filename}`}
                className="animate-in slide-in-from-bottom-4 duration-300"
                style={{ animationDelay: `${index * 25}ms` }} // Reduced delay for better performance
              >
                <DocumentCard
                  library={currentLibrary}
                  document={document}
                  onClick={onDocumentClick}
                  onDownload={onDownload}
                  onFavoriteToggle={onFavoriteToggle}
                />
              </div>
            ))}
          </div>

          {/* Pagination controls for card view */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onGoToPage={goToPage}
            className="mt-8"
          />
        </>
      ) : (
        <>
          <DocumentList
            documents={paginatedItems}
            onClick={onDocumentClick}
            onDownload={onDownload}
            onFavoriteToggle={onFavoriteToggle}
          />

          {/* Pagination controls for list view */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onGoToPage={goToPage}
            className="mt-8"
          />
        </>
      )}
    </div>
  );
}
