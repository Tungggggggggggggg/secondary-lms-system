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
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="text-[11px] text-slate-600">
        {selectedCount > 0 ? (
          <>
            Đã chọn <span className="font-semibold text-slate-900">{selectedCount}</span> học sinh
            <span className="text-slate-500"> (áp dụng cho các hàng đã chọn trong nhiều trang)</span>
          </>
        ) : (
          <span>Chọn học sinh để xoá nhiều khỏi lớp.</span>
        )}
      </div>
      {selectedCount > 0 && (
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
            className="border-red-200 text-red-700 hover:bg-red-50"
          >
            {isProcessing ? "Đang xóa..." : "Xóa đã chọn"}
          </Button>
        </div>
      )}
    </div>
  );
}
