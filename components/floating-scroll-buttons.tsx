"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

// The page layout (home.tsx) is h-screen + overflow-hidden on the root, so the
// window itself never scrolls — the SidebarInset (<main data-slot="sidebar-inset">)
// is the real scroll container. Target it instead of `window`.
const SCROLL_CONTAINER_SELECTOR = '[data-slot="sidebar-inset"]';

export function FloatingScrollButtons() {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(
      SCROLL_CONTAINER_SELECTOR,
    );
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrollable = scrollHeight > clientHeight;
      setShowButtons(isScrollable && scrollTop > 100);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Re-check on resize / content changes so buttons appear once content overflows.
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(container);
    resizeObserver.observe(document.body);
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    const container = document.querySelector<HTMLElement>(
      SCROLL_CONTAINER_SELECTOR,
    );
    container?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const container = document.querySelector<HTMLElement>(
      SCROLL_CONTAINER_SELECTOR,
    );
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  };

  if (!showButtons) return null;

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToTop}
        className="shadow-md hover:shadow-lg transition-all bg-opacity-80 backdrop-blur-sm"
        title="Scroll to top"
      >
        <ArrowUpIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={scrollToBottom}
        className="shadow-md hover:shadow-lg transition-all bg-opacity-80 backdrop-blur-sm"
        title="Scroll to bottom"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
