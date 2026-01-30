import { useState, useRef } from "react";

export function useImageLoading() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleLoad = (src: string) => {
    setLoadedImages(prev => new Set(prev).add(src));
  };

  const handleError = (src: string) => {
    setErrorImages(prev => new Set(prev).add(src));
  };

  const isLoaded = (src: string): boolean => {
    return loadedImages.has(src);
  };

  const hasError = (src: string): boolean => {
    return errorImages.has(src);
  };

  const observeImage = (
    element: HTMLElement,
    src: string
  ) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (!img.src && !isLoaded(src) && !hasError(src)) {
              img.src = src;
            }
          }
        });
      }, {
        rootMargin: "50px",
        threshold: 0.01,
      });
    }

    if (element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  };

  return {
    handleLoad,
    handleError,
    isLoaded,
    hasError,
    observeImage,
  };
}
