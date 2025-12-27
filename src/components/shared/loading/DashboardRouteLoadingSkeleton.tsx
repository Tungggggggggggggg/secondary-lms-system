"use client";

import CardGridSkeleton from "@/components/shared/loading/CardGridSkeleton";
import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardRouteLoadingSkeletonProps {
  kpiCount: number;
}

/**
 * Render skeleton cho các trang dashboard theo role.
 * @param props - Cấu hình số lượng KPI card.
 * @returns JSX.
 */
export default function DashboardRouteLoadingSkeleton({
  kpiCount,
}: DashboardRouteLoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton />

      <CardGridSkeleton
        items={kpiCount}
        gridClassName={
          kpiCount >= 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-2 lg:grid-cols-3"
        }
        itemClassName={kpiCount >= 4 ? "h-24" : "h-28"}
      />

      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
