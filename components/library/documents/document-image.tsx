"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Document } from "@/lib/library";
import { useImageLoading } from "@/hooks/use-image-loading";
import { invoke } from "@tauri-apps/api/core";

interface DocumentImageProps {
  document: Document;
}

export function DocumentImage({ document }: DocumentImageProps) {
  const { metadata } = document;
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverLoading, setCoverLoading] = useState(true);

  // Load cover URL asynchronously
  useEffect(() => {
    const loadCoverUrl = async () => {
      try {
        const url = await invoke<string>("get_cover", {
          documentId: document.id,
        });
        setCoverUrl(url);
      } catch (error) {
        console.error("Error loading cover URL:", error);
        setCoverUrl(
          "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDE1MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMSIvPgo8dGV4dCB4PSI3NSIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiPk5vIENvdmVyPC90ZXh0Pgo8L3N2Zz4=",
        );
      } finally {
        setCoverLoading(false);
      }
    };

    loadCoverUrl();
  }, [document]);

  // Lazy load images with intersection observer
  const { isLoaded, hasError, observeImage, handleLoad, handleError } =
    useImageLoading();

  const imageRef = (img: HTMLImageElement) => {
    if (coverUrl) {
      observeImage(img, coverUrl);
      if (!isLoaded(coverUrl) && !hasError(coverUrl)) {
        handleLoad(coverUrl);
      }
    }
  };

  if (coverLoading) {
    return (
      <div className="shrink-0">
        <div className="w-[150px] h-[200px] bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="cursor-pointer">
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
