"use client";

import { cn } from "@/lib/utils";

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

export default function SkeletonList({ rows = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-slate-200 bg-slate-100/60 animate-pulse"
        />
      ))}
    </div>
  );
}
