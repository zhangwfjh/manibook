import React, { useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/library/documents/card";
import { DocumentList } from "@/components/library/documents/list";
import { VirtualList } from "@/components/library/documents/virtual-list";
import { DocumentCardSkeleton } from "@/components/library/documents/card-skeleton";
import { DocumentListSkeleton } from "@/components/library/documents/list-skeleton";
import { Pagination } from "@/components/library/ui/pagination";
import { BookOpenIcon, LibraryIcon } from "lucide-react";
import { useLibraryContext } from "@/contexts/LibraryContext";
import { useDocumentActionsContext } from "@/contexts/DocumentActionsContext";
import { usePaginationControls } from "@/hooks/use-pagination-controls";

type ViewMode = "card" | "list";

interface ContentProps {
  viewMode: ViewMode;
}

export function Content({ viewMode }: ContentProps) {
  const {
    currentLibrary,
    setCurrentLibrary,
    selectedCategory,
    documents,
    loading,
    pagination,
    loadPage,
    selectionMode,
    selectedDocuments,
    setSelectedCategory,
    libraries,
    setCreateLibraryOpen,
    filterParams,
    sortParams,
  } = useLibraryContext();

  const {
    handleOpen,
    handleFavoriteToggle,
    handleDocumentDelete,
    handleToggleDocumentSelection,
    onDocumentClick,
  } = useDocumentActionsContext();

  const {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  } = usePaginationControls(pagination, loadPage, filterParams, sortParams);
  const totalCount = pagination?.totalCount || 0;

  const paginatedItems = documents;

  const useVirtualList = useMemo(() => {
    return viewMode === "list" && paginatedItems.length > 50;
  }, [viewMode, paginatedItems.length]);

  const paginationComponent = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onNextPage={nextPage}
      onPrevPage={prevPage}
      onGoToPage={goToPage}
      className="mt-8"
    />
  );

  if (libraries.length === 0) {
    return (
      <div className="flex-1 min-w-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LibraryIcon className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>Welcome to ManiBook</EmptyTitle>
            <EmptyDescription>
              Create your first library to start organizing your document
              collection with powerful search and filtering capabilities.
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex justify-center">
            <Button onClick={() => setCreateLibraryOpen(true)}>
              Create Library
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  if (!currentLibrary) {
    return (
      <div className="flex-1 min-w-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>Select a Library</EmptyTitle>
          <EmptyDescription>
            You have {libraries.length} {libraries.length === 1 ? 'library' : 'libraries'} available.
            Select one from the list below to view its documents.
          </EmptyDescription>
        </EmptyHeader>
        <div className="w-full max-w-md">
          <div className="space-y-1">
            {libraries.map((library) => (
              <button
                key={library.name}
                onClick={() => setCurrentLibrary(library.name)}
                className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors text-sm text-foreground hover:text-primary flex items-center gap-2"
              >
                <LibraryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{library.name}</span>
              </button>
            ))}
            <button
              onClick={() => setCreateLibraryOpen(true)}
              className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors text-sm text-foreground hover:text-primary flex items-center gap-2"
            >
              <LibraryIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Create New Library</span>
            </button>
          </div>
        </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 space-y-6">
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
                    setSelectedCategory("");
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
                            setSelectedCategory(newCategory);
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
          <span className="font-medium text-foreground">
            {totalCount || documents.length}
          </span>
          <span>
            document{(totalCount || documents.length) !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {loading ? (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <DocumentCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <DocumentListSkeleton rows={10} />
        )
      ) : documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>No documents found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search query, category filter, or import some
              documents to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "card" ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-6">
            {paginatedItems.map((document) => (
              <DocumentCard
                key={document.id}
                library={currentLibrary}
                document={document}
                onClick={onDocumentClick}
                onOpen={handleOpen}
                onFavoriteToggle={handleFavoriteToggle}
                onDelete={handleDocumentDelete}
                selectionMode={selectionMode}
                selected={selectedDocuments.has(document.id)}
                onToggleSelection={handleToggleDocumentSelection}
              />
            ))}
          </div>

          {paginationComponent}
        </>
      ) : useVirtualList ? (
        <>
          <VirtualList
            documents={paginatedItems}
            onClick={onDocumentClick}
            onOpen={handleOpen}
            onFavoriteToggle={handleFavoriteToggle}
            onDelete={handleDocumentDelete}
            selectionMode={selectionMode}
            selectedDocuments={selectedDocuments}
            onToggleDocumentSelection={handleToggleDocumentSelection}
          />

          {paginationComponent}
        </>
      ) : (
        <>
          <DocumentList
            documents={paginatedItems}
            onClick={onDocumentClick}
            onOpen={handleOpen}
            onFavoriteToggle={handleFavoriteToggle}
            onDelete={handleDocumentDelete}
            selectionMode={selectionMode}
            selectedDocuments={selectedDocuments}
            onToggleDocumentSelection={handleToggleDocumentSelection}
          />

          {paginationComponent}
        </>
      )}
    </div>
  );
}
