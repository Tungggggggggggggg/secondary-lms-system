"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CardGridSkeletonProps {
  items: number;
  gridClassName?: string;
  itemClassName?: string;
}

/**
 * Render skeleton grid cho nhóm card.
 * @param props - Cấu hình số lượng item và className.
 * @returns JSX.
 */
export default function CardGridSkeleton({
  items,
  gridClassName,
  itemClassName,
}: CardGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4", gridClassName)}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className={cn("h-28 w-full", itemClassName)} />
      ))}
    </div>
  );
}
