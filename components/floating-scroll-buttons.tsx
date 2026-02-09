"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

export function FloatingScrollButtons() {
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const isScrollable = scrollHeight > clientHeight;

      setShowButtons(isScrollable && scrollTop > 100);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
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
