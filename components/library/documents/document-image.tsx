"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Document } from "@/lib/library";
import { useCoverStore } from "@/stores";

interface DocumentImageProps {
  document: Document;
}

export function DocumentImage({ document }: DocumentImageProps) {
  const { metadata } = document;
  const coverUrl = useCoverStore((s) => s.covers[document.id]);
  const loading = useCoverStore((s) => !!s.loading[document.id]);
  const loadCover = useCoverStore((s) => s.loadCover);

  // Fetch + cache the cover once per document id.
  useEffect(() => {
    loadCover(document.id);
  }, [document.id, loadCover]);

  if (loading || !coverUrl) {
    return (
      <div className="shrink-0">
        <div className="w-[150px] h-[200px] bg-muted/50 rounded-lg animate-pulse" />
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
              src={coverUrl}
              alt={`${metadata.title} cover`}
              width={150}
              height={200}
              className="object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              loading="lazy"
              unoptimized
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
            className="object-cover rounded-lg shadow-lg"
            loading="eager"
            unoptimized
          />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
