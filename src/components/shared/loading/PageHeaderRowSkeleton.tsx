"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderRowSkeletonProps {
  titleClassName?: string;
  actionClassName?: string;
  actionsCount?: number;
}

/**
 * Render skeleton cho hàng header (title + actions).
 * @param props - Cấu hình độ rộng title/action và số lượng actions.
 * @returns JSX skeleton header row.
 */
export default function PageHeaderRowSkeleton({
  titleClassName = "h-10 w-56",
  actionClassName = "h-10 w-32",
  actionsCount = 1,
}: PageHeaderRowSkeletonProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Skeleton className={titleClassName} />
      {actionsCount > 0 ? (
        <div className="flex items-center gap-2">
          {Array.from({ length: actionsCount }).map((_, idx) => (
            <Skeleton key={idx} className={actionClassName} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
