"use client";

import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface DetailRouteLoadingSkeletonProps {
  showActions?: boolean;
  leftCardHeightClassName?: string;
  rightCardHeightClassName?: string;
}

/**
 * Render skeleton cho các trang detail dạng 2 cột.
 * @param props - Tuỳ chọn action và chiều cao các panel.
 * @returns JSX.
 */
export default function DetailRouteLoadingSkeleton({
  showActions = true,
  leftCardHeightClassName = "h-56",
  rightCardHeightClassName = "h-56",
}: DetailRouteLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton
        titleClassName="h-8 w-64"
        actionClassName="h-10 w-28"
        actionsCount={showActions ? 2 : 0}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className={`${leftCardHeightClassName} w-full`} />
        <Skeleton className={`${rightCardHeightClassName} w-full`} />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
