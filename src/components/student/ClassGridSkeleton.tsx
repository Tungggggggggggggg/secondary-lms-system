"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface ClassGridSkeletonProps {
  count?: number;
  variant?: "grid" | "list";
}

export default function ClassGridSkeleton({ count = 6, variant = "grid" }: ClassGridSkeletonProps) {
  if (variant === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border motion-safe:animate-pulse">
            <div className="h-14 w-14 rounded-2xl flex-shrink-0 bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted rounded" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border overflow-hidden motion-safe:animate-pulse">
          <div className="h-[200px] w-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
