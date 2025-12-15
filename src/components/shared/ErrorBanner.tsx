"use client";

import Button from "@/components/ui/button";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold">Không thể tải dữ liệu</div>
        <div className="text-xs text-red-700 truncate">{message}</div>
      </div>

      {onRetry ? (
        <Button type="button" variant="outline" color="amber" onClick={onRetry} className="shrink-0">
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
