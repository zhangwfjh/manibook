import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentCardSkeleton() {
  return (
    <Card className="w-full h-full flex flex-row border-border/50">
      <div className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <div className="flex gap-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>

        <CardContent className="flex flex-row gap-4">
          <div className="space-y-4 flex-1">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>

          <div className="shrink-0">
            <Skeleton className="w-37.5 h-50 rounded" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
