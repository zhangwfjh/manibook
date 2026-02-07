"use client";

import React from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { DocumentCardSkeleton } from "@/components/library/documents/card-skeleton";
import { Pagination } from "./pagination";
import { BookOpenIcon, LibraryIcon, XIcon } from "lucide-react";
import {
  useLibraryDataStore,
  useLibraryFilterStore,
  useLibraryOperations,
  useLibraryUIStore,
} from "@/stores";
import { useFilterWithReload } from "@/hooks/library";

export function Content() {
  const {
    libraryName,
    setLibraryName,
    libraries,
    documents,
    loading,
    pagination,
  } = useLibraryDataStore();
  const { selectedCategory, getFilterParams } = useLibraryFilterStore();
  const { setSelectedCategory } = useFilterWithReload();
  const { loadPage, closeLibrary } = useLibraryOperations();
  const { sortBy } = useLibraryUIStore();

  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const totalCount = pagination?.totalCount || 0;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;

  const goToPage = (page: number) => {
    const filterParams = getFilterParams();
    const params = new URLSearchParams();
    if (filterParams) {
      filterParams.forEach((value, key) => params.set(key, value));
    }
    if (sortBy) {
      params.set("sortBy", sortBy);
    }
    loadPage(page, params);
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

  const paginatedItems = documents;

  const paginationComponent = (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onNextPage={nextPage}
      onPrevPage={prevPage}
      onGoToPage={goToPage}
      className="mt-8"
    />
  );

  if (!libraryName) {
    return (
      <div className="flex-1 min-w-0">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>Welcome to ManiBook</EmptyTitle>
            <EmptyDescription>
              Create a new library or Select one from the list below.
            </EmptyDescription>
          </EmptyHeader>
          <div className="w-full max-w-md space-y-1">
            {libraries.map((library) => (
              <Button
                key={library.name}
                variant="ghost"
                onClick={async () => {
                  await invoke("open_library", { libraryName: library.name });
                  setLibraryName(library.name);
                }}
                className="w-full justify-start text-left"
              >
                <LibraryIcon className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="font-medium">{library.name}</span>
              </Button>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() =>
                useLibraryUIStore.getState().setCreateLibraryOpen(true)
              }
            >
              Create Library
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>Location:</BreadcrumbItem>
            <BreadcrumbItem>
              <div className="flex items-center gap-1">
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedCategory("");
                  }}
                  className="transition-colors hover:text-foreground"
                >
                  {libraryName}
                </BreadcrumbLink>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={closeLibrary}
                  title="Close library"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
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
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <DocumentCardSkeleton key={index} />
          ))}
        </div>
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
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
            {paginatedItems.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>

          {paginationComponent}
        </>
      )}
    </div>
  );
}
