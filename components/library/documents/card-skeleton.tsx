import { Skeleton } from "@/components/ui/skeleton";

export function DocumentCardSkeleton() {
  return (
    <div className="w-full h-full flex flex-row rounded-lg border border-border/60 overflow-hidden">
      {/* Cover column */}
      <div className="w-[108px] shrink-0">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-w-0 p-3 gap-2">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
        </div>

        {/* Abstract */}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />

        {/* Footer */}
        <div className="mt-auto pt-1 flex items-center gap-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
