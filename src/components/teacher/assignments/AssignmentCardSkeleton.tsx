"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function AssignmentCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex items-center gap-3 ml-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-200 w-1/3" />
        </div>
      </div>
    </div>
  );
}
