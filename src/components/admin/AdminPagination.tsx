"use client";

import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function AdminPagination({ page, totalPages, total, onPageChange, className }: AdminPaginationProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm text-slate-600", className)}>
      <div className="min-w-0">
        Trang <span className="font-semibold text-slate-900">{page}</span> / {totalPages} • Total{" "}
        <span className="font-semibold text-slate-900">{total.toLocaleString("vi-VN")}</span>
      </div>
      <div className="inline-flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
