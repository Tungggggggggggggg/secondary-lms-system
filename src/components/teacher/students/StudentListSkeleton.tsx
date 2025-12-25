interface StudentListSkeletonProps {
  items?: number;
}

export default function StudentListSkeleton({ items = 4 }: StudentListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-card rounded-2xl p-6 shadow-sm border border-border animate-pulse"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 bg-muted rounded" />
              <div className="h-3 w-64 bg-muted/60 rounded" />
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="h-12 bg-muted/60 rounded-xl" />
                <div className="h-12 bg-muted/60 rounded-xl" />
                <div className="h-12 bg-muted/60 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
