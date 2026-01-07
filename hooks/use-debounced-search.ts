import { useState, useEffect, useCallback } from 'react';

export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Debounce the search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  // Track searching state based on whether value differs from debounced value
  const isSearching = value !== debouncedValue;

  const updateSearch = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const clearSearch = useCallback(() => {
    setValue('');
  }, []);

  return {
    searchValue: value,
    debouncedSearchValue: debouncedValue,
    isSearching,
    updateSearch,
    clearSearch,
  };
}
