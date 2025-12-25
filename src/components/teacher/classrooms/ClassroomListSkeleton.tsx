import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassroomListSkeletonProps {
  items?: number;
  className?: string;
}

export default function ClassroomListSkeleton({
  items = 3,
  className,
}: ClassroomListSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <Skeleton className="h-3 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
