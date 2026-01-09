import { useDebouncedCallback } from "use-debounce";
import { useMemo, useState, useEffect } from "react";

export function useDebouncedFilters(filterParams: URLSearchParams, delay: number = 300) {
  const [debouncedParams, setDebouncedParams] = useState<URLSearchParams>(filterParams);

  const debouncedSetParams = useDebouncedCallback(
    (params: URLSearchParams) => {
      setDebouncedParams(new URLSearchParams(params.toString()));
    },
    delay
  );

  useEffect(() => {
    debouncedSetParams(filterParams);
  }, [filterParams, debouncedSetParams]);

  return useMemo(() => {
    const combinedParams = new URLSearchParams();
    debouncedParams.forEach((value: string, key: string) => {
      combinedParams.set(key, value);
    });
    return combinedParams;
  }, [debouncedParams]);
}
