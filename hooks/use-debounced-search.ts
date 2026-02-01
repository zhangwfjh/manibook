import { useState } from 'react';
import { useDebounce } from 'use-debounce';

export function useDebouncedSearch(
  initialValue: string = '',
  delay: number = 300
) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue] = useDebounce(value, delay);

  // Track searching state based on whether value differs from debounced value
  const isSearching = value !== debouncedValue;

  const updateSearch = (newValue: string) => {
    setValue(newValue);
  };

  return {
    searchValue: value,
    debouncedSearchValue: debouncedValue,
    isSearching,
    updateSearch,
  };
}
