"use client";

import Button from "@/components/ui/button";

interface AdminStudentsSelectionBarProps {
  selectedCount: number;
  isProcessing?: boolean;
  isArchived?: boolean;
  onClear: () => void;
  onBulkRemove: () => void;
}

export default function AdminStudentsSelectionBar({
  selectedCount,
  isProcessing,
  isArchived,
  onClear,
  onBulkRemove,
}: AdminStudentsSelectionBarProps) {
  const disabled = selectedCount === 0 || !!isProcessing || !!isArchived;

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-muted-foreground">
        {selectedCount > 0 ? (
          <>
            Đã chọn <span className="font-semibold text-foreground">{selectedCount}</span> học sinh
            <span className="text-muted-foreground"> (áp dụng cho các hàng đã chọn trong nhiều trang)</span>
          </>
        ) : (
          <span>Chọn học sinh để xoá nhiều khỏi lớp.</span>
        )}
      </div>
      {selectedCount > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-2 shadow-sm">
          <div className="text-[11px] font-semibold text-indigo-900">
            Đang chọn <span className="text-indigo-700">{selectedCount}</span> học sinh
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={onClear}
              disabled={selectedCount === 0 || !!isProcessing}
            >
              Bỏ chọn
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              color="slate"
              onClick={onBulkRemove}
              disabled={disabled}
              className="border-destructive/20 text-destructive/90 hover:bg-destructive/5"
            >
              {isProcessing ? "Đang xóa..." : "Xóa đã chọn"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
