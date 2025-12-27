"use client";

import CardGridSkeleton from "@/components/shared/loading/CardGridSkeleton";
import CardListSkeleton from "@/components/shared/loading/CardListSkeleton";
import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";

/**
 * Render skeleton cho route tiến độ học tập phụ huynh.
 * @returns JSX.
 */
export default function ParentProgressRouteLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-64" actionsCount={0} />
      <CardGridSkeleton items={4} gridClassName="md:grid-cols-2 lg:grid-cols-4" itemClassName="h-32 rounded-2xl" />
      <CardListSkeleton items={2} simple simpleItemClassName="h-24" />
    </div>
  );
}
