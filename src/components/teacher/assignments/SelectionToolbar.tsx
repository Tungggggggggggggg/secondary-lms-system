"use client";

interface SelectionToolbarProps {
  selected: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
}

export default function SelectionToolbar({ selected, total, onSelectAll, onClear }: SelectionToolbarProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span aria-live="polite" className="text-gray-600">
        Đã chọn: {selected} / {total}
      </span>
      <div className="flex gap-2">
        <button onClick={onSelectAll} className="text-blue-600 hover:underline">
          Chọn tất cả
        </button>
        <span className="text-gray-400">|</span>
        <button onClick={onClear} className="text-blue-600 hover:underline">
          Bỏ chọn tất cả
        </button>
      </div>
    </div>
  );
}
