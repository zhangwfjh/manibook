import { useState, useEffect, useCallback } from "react";
import { LibraryDocument, LibraryCategory } from "@/lib/library";
import { Library } from "@/lib/library";

export function useLibraryData() {
  const [currentLibrary, setCurrentLibrary] = useState<string>("");
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibraries = useCallback(async () => {
    try {
      const response = await fetch("/api/libraries");
      const data = await response.json();
      const libs = data.libraries || [];
      setLibraries(libs);
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }, []);

  const fetchLibraryData = useCallback(async () => {
    if (!currentLibrary) return;
    try {
      const response = await fetch(
        `/api/libraries/${currentLibrary}/documents`
      );
      const data = await response.json();
      setDocuments(data.documents || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching library data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentLibrary]);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  useEffect(() => {
    if (libraries.length > 0 && !currentLibrary) {
      setCurrentLibrary(libraries[0].name);
    }
  }, [libraries, currentLibrary]);

  useEffect(() => {
    if (currentLibrary) {
      setDocuments([]);
      fetchLibraryData();
    }
  }, [currentLibrary, fetchLibraryData]);

  const refreshLibraries = useCallback(async () => {
    await fetchLibraries();
  }, [fetchLibraries]);

  const refreshLibraryData = useCallback(async () => {
    await fetchLibraryData();
  }, [fetchLibraryData]);

  return {
    currentLibrary,
    setCurrentLibrary,
    libraries,
    documents,
    setDocuments,
    categories,
    loading,
    refreshLibraries,
    refreshLibraryData,
  };
}
