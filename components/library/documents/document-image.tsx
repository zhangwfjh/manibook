import React, { useCallback } from "react";
import Image from "next/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { LibraryDocument } from "@/lib/library";
import { getCoverUrl } from "@/lib/library";
import { useImageLoading } from "@/hooks/use-image-loading";

interface DocumentImageProps {
  library: string;
  document: LibraryDocument;
}

export function DocumentImage({ library, document }: DocumentImageProps) {
  const { metadata } = document;
  const coverUrl = getCoverUrl(library, document);

  // Lazy load images with intersection observer
  const { isLoaded, hasError, observeImage, handleLoad, handleError } =
    useImageLoading();

  const imageRef = useCallback(
    (img: HTMLImageElement) => {
      observeImage(img, coverUrl);
      if (!isLoaded(coverUrl) && !hasError(coverUrl)) {
        handleLoad(coverUrl);
      }
    },
    [coverUrl, isLoaded, hasError, observeImage, handleLoad]
  );

  return (
    <div className="shrink-0">
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="cursor-pointer">
            <div className="bg-muted/50 blur-sm rounded animate-pulse" />
            <Image
              key={coverUrl}
              ref={imageRef}
              src={coverUrl}
              alt={`${metadata.title} cover`}
              width={150}
              height={200}
              className="object-cover rounded border shadow-sm hover:shadow-md transition-opacity duration-200"
              loading="lazy"
              unoptimized
              onLoad={() => handleLoad(coverUrl)}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                handleError(coverUrl);
              }}
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          className="w-auto p-0 border-0 shadow-2xl"
          side="right"
          align="start"
        >
          <Image
            key={coverUrl}
            src={coverUrl}
            alt={`${metadata.title} cover`}
            width={480}
            height={640}
            className="object-cover rounded border shadow-lg"
            loading="eager"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
