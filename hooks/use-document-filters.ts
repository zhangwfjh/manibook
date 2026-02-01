import { useReducer } from "react";
import { useDebouncedSearch } from "./use-debounced-search";

interface FilterState {
  selectedCategory: string;
  selectedKeywords: string[];
  selectedFormats: string[];
  selectedAuthors: string[];
  selectedPublishers: string[];
  selectedLanguages: string[];
  showFavoritesOnly: boolean;
}

type FilterAction =
  | { type: "SET_CATEGORY"; payload: string }
  | { type: "SET_KEYWORDS"; payload: string[] }
  | { type: "SET_FORMATS"; payload: string[] }
  | { type: "SET_AUTHORS"; payload: string[] }
  | { type: "SET_PUBLISHERS"; payload: string[] }
  | { type: "SET_LANGUAGES"; payload: string[] }
  | { type: "SET_FAVORITES"; payload: boolean }
  | { type: "RESET" };

const initialState: FilterState = {
  selectedCategory: "",
  selectedKeywords: [],
  selectedFormats: [],
  selectedAuthors: [],
  selectedPublishers: [],
  selectedLanguages: [],
  showFavoritesOnly: false,
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_CATEGORY":
      return { ...state, selectedCategory: action.payload };
    case "SET_KEYWORDS":
      return { ...state, selectedKeywords: action.payload };
    case "SET_FORMATS":
      return { ...state, selectedFormats: action.payload };
    case "SET_AUTHORS":
      return { ...state, selectedAuthors: action.payload };
    case "SET_PUBLISHERS":
      return { ...state, selectedPublishers: action.payload };
    case "SET_LANGUAGES":
      return { ...state, selectedLanguages: action.payload };
    case "SET_FAVORITES":
      return { ...state, showFavoritesOnly: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useDocumentFilters() {
  const [state, dispatch] = useReducer(filterReducer, initialState);

  const {
    searchValue: searchQuery,
    debouncedSearchValue: debouncedSearchQuery,
    updateSearch: setSearchQuery,
    isSearching,
  } = useDebouncedSearch("", 300);

  const filterParams = new URLSearchParams();

  if (state.selectedCategory) {
    filterParams.set("category", state.selectedCategory);
  }

  if (state.selectedKeywords.length > 0) {
    filterParams.set("keywords", state.selectedKeywords.join(","));
  }

  if (state.selectedFormats.length > 0) {
    filterParams.set("formats", state.selectedFormats.join(","));
  }

  if (state.selectedAuthors.length > 0) {
    filterParams.set("authors", state.selectedAuthors.join(","));
  }

  if (state.selectedPublishers.length > 0) {
    filterParams.set("publishers", state.selectedPublishers.join(","));
  }

  if (state.selectedLanguages.length > 0) {
    filterParams.set("languages", state.selectedLanguages.join(","));
  }

  if (debouncedSearchQuery) {
    filterParams.set("search", debouncedSearchQuery);
  }

  if (state.showFavoritesOnly) {
    filterParams.set("favoritesOnly", "true");
  }

  const resetFilters = () => {
    dispatch({ type: "RESET" });
    setSearchQuery("");
  };

  const hasActiveFilters = !!(
    state.selectedCategory ||
    state.selectedKeywords.length ||
    state.selectedFormats.length ||
    state.selectedAuthors.length ||
    state.selectedPublishers.length ||
    state.selectedLanguages.length ||
    searchQuery ||
    state.showFavoritesOnly
  );

  const setSelectedCategory = (category: string) =>
    dispatch({ type: "SET_CATEGORY", payload: category });
  const setSelectedKeywords = (keywords: string[]) =>
    dispatch({ type: "SET_KEYWORDS", payload: keywords });
  const setSelectedFormats = (formats: string[]) =>
    dispatch({ type: "SET_FORMATS", payload: formats });
  const setSelectedAuthors = (authors: string[]) =>
    dispatch({ type: "SET_AUTHORS", payload: authors });
  const setSelectedPublishers = (publishers: string[]) =>
    dispatch({ type: "SET_PUBLISHERS", payload: publishers });
  const setSelectedLanguages = (languages: string[]) =>
    dispatch({ type: "SET_LANGUAGES", payload: languages });
  const setShowFavoritesOnly = (show: boolean) =>
    dispatch({ type: "SET_FAVORITES", payload: show });

  return {
    selectedCategory: state.selectedCategory,
    setSelectedCategory,
    selectedKeywords: state.selectedKeywords,
    setSelectedKeywords,
    selectedFormats: state.selectedFormats,
    setSelectedFormats,
    selectedAuthors: state.selectedAuthors,
    setSelectedAuthors,
    selectedPublishers: state.selectedPublishers,
    setSelectedPublishers,
    selectedLanguages: state.selectedLanguages,
    setSelectedLanguages,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly: state.showFavoritesOnly,
    setShowFavoritesOnly,
    filterParams,
    hasActiveFilters,
    resetFilters,
    isSearching,
  };
}
