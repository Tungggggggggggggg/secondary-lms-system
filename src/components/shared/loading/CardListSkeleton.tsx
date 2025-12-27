"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CardListSkeletonProps {
  items?: number;
  className?: string;
  cardClassName?: string;
  showChips?: boolean;
  simple?: boolean;
  simpleItemClassName?: string;
}

/**
 * Render danh sách card skeleton.
 * @param props - Cấu hình số lượng item và className.
 * @returns JSX.
 */
export default function CardListSkeleton({
  items = 3,
  className,
  cardClassName,
  showChips = true,
  simple = false,
  simpleItemClassName,
}: CardListSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        simple ? (
          <Skeleton
            key={i}
            className={cn("w-full rounded-2xl", simpleItemClassName)}
          />
        ) : (
          <div
            key={i}
            className={cn(
              "bg-card/90 rounded-2xl border border-border p-4 sm:p-5",
              cardClassName
            )}
          >
            <Skeleton className="h-4 w-1/3 mb-3" />
            <Skeleton className="h-3 w-2/3 mb-4" />
            {showChips ? (
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ) : null}
          </div>
        )
      ))}
    </div>
  );
}
