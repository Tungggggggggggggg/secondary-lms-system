"use client";

import CardGridSkeleton from "@/components/shared/loading/CardGridSkeleton";
import CardListSkeleton from "@/components/shared/loading/CardListSkeleton";
import PageHeaderRowSkeleton from "@/components/shared/loading/PageHeaderRowSkeleton";

/**
 * Render skeleton cho route danh sách bài tập học sinh.
 * @returns JSX.
 */
export default function StudentAssignmentsRouteLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderRowSkeleton titleClassName="h-10 w-64" actionsCount={0} />
      <CardGridSkeleton items={4} gridClassName="md:grid-cols-4" itemClassName="h-[140px] rounded-2xl" />
      <CardListSkeleton items={3} />
    </div>
  );
}
