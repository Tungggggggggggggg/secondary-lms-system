"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface KpiSkeletonGridProps {
  count?: number;
}

export default function KpiSkeletonGrid({ count = 5 }: KpiSkeletonGridProps) {
  return (
    <div className="grid gap-5 xl:gap-6 mb-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[140px] rounded-3xl" />
      ))}
    </div>
  );
}
