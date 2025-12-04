interface StudentListSkeletonProps {
  items?: number;
}

export default function StudentListSkeleton({ items = 4 }: StudentListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
