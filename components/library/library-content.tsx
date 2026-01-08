import React from "react";
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
import { LibraryDocument } from "@/lib/library";
import { BookOpenIcon } from "lucide-react";

type ViewMode = "card" | "list";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface LibraryContentProps {
  currentLibrary: string;
  selectedCategory: string;
  documents: LibraryDocument[];
  viewMode: ViewMode;
  pagination?: PaginationInfo | null;
  onDocumentClick: (document: LibraryDocument) => void;
  onDownload: (doc: LibraryDocument) => void;
  onFavoriteToggle: (document: LibraryDocument) => void;
  onBreadcrumbClick: (category: string) => void;
  onPageChange?: (page: number) => void;
}

export function LibraryContent({
  currentLibrary,
  selectedCategory,
  documents,
  viewMode,
  pagination,
  onDocumentClick,
  onDownload,
  onFavoriteToggle,
  onBreadcrumbClick,
  onPageChange,
}: LibraryContentProps) {
  // Use server-side pagination data
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;
  const totalCount = pagination?.totalCount || 0;

  // Since we're using server-side pagination, all documents are already paginated
  const paginatedItems = documents;

  const goToPage = (page: number) => {
    onPageChange?.(page);
  };

  const nextPage = () => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (hasPrevPage) {
      goToPage(currentPage - 1);
    }
  };

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
            {totalCount || documents.length}
          </span>
          <span>document{(totalCount || documents.length) !== 1 ? "s" : ""} found</span>
        </div>
      </div>

      {documents.length === 0 ? (
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
