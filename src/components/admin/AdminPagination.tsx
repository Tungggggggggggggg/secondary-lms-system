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
    <div className={cn("flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 order-2 sm:order-1">
        Trang <span className="font-semibold text-slate-900">{page}</span> / {totalPages} • Tổng{" "}
        <span className="font-semibold text-slate-900">{total.toLocaleString("vi-VN")}</span>
      </div>
      <div className="order-1 sm:order-2 inline-flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          color="slate"
          className="min-w-20 justify-center"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          color="slate"
          className="min-w-20 justify-center"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
