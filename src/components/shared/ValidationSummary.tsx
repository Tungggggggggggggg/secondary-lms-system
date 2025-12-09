"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationSummaryProps {
  issues: string[];
  className?: string;
}

export default function ValidationSummary({ issues, className }: ValidationSummaryProps) {
  if (!issues || issues.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-xl border border-red-200 bg-red-50/80 text-red-800 p-5",
        "border-l-4 border-l-red-500",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 mt-0.5" />
        <div>
          <div className="font-semibold text-base mb-2">Vui lòng kiểm tra các lỗi sau</div>
          <ul className="list-disc pl-5 space-y-1.5 text-sm">
            {issues.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
