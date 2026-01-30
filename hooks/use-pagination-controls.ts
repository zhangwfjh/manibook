import { PaginationInfo } from "@/lib/library";

export function usePaginationControls(
  pagination: PaginationInfo | null,
  loadPage: (page: number, filters?: URLSearchParams) => void,
  filterParams?: URLSearchParams,
  sortParams?: URLSearchParams
) {
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const hasNextPage = pagination?.hasNextPage || false;
  const hasPrevPage = pagination?.hasPrevPage || false;

  const goToPage = (page: number) => {
    const combinedParams = new URLSearchParams();
    if (filterParams) {
      filterParams.forEach((value, key) => combinedParams.set(key, value));
    }
    if (sortParams) {
      sortParams.forEach((value, key) => combinedParams.set(key, value));
    }
    loadPage(page, combinedParams);
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

  return {
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  };
}
