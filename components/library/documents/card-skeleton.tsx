import { Skeleton } from "@/components/ui/skeleton";
import type { ViewMode } from "@/lib/library";

export function DocumentCardSkeleton({ variant = "grid" }: { variant?: ViewMode }) {
  if (variant === "cover") {
    return (
      <div className="flex flex-col rounded-lg border border-border/50 overflow-hidden shadow-book">
        <Skeleton className="aspect-[3/4] w-full rounded-none" />
        <div className="p-3 space-y-1.5">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="flex flex-row items-center rounded-lg border border-border/50 p-2.5 gap-3">
        <Skeleton className="h-14 w-[42px] rounded-sm shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-row rounded-lg border border-border/60 overflow-hidden">
      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0 p-3.5 gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
        </div>

        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />

        <div className="mt-auto pt-2 flex items-center gap-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
      </div>
      {/* Cover column */}
      <div className="w-[130px] shrink-0">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    </div>
  );
}
