"use client";

import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type ClassroomStatus = "all" | "active" | "archived";
export type ClassroomSort = "newest" | "oldest" | "name" | "students";

interface ClassroomFiltersProps {
  status: ClassroomStatus;
  onStatusChange: (value: ClassroomStatus) => void;
  sortBy: ClassroomSort;
  onSortChange: (value: ClassroomSort) => void;
  search: string;
  onSearchChange: (value: string) => void;
  showStatusFilter?: boolean;
  showSortSelect?: boolean;
  showSearchInput?: boolean;
  className?: string;
}

export default function ClassroomFilters({
  status,
  onStatusChange,
  sortBy,
  onSortChange,
  search,
  onSearchChange,
  showStatusFilter = true,
  showSortSelect = true,
  showSearchInput = true,
  className,
}: ClassroomFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 mb-8",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {showStatusFilter && (
          <Select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as ClassroomStatus)
            }
            className="min-w-[180px]"
            color="blue"
          >
            <option value="all">Tất cả lớp học</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </Select>
        )}

        {showSortSelect && (
          <Select
            value={sortBy}
            onChange={(event) =>
              onSortChange(event.target.value as ClassroomSort)
            }
            className="min-w-[180px]"
            color="blue"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name">Theo tên</option>
            <option value="students">Số học sinh</option>
          </Select>
        )}
      </div>

      {showSearchInput && (
        <div className="relative w-full sm:w-auto sm:min-w-[240px]">
          <Input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm kiếm lớp học..."
            className="pl-9 pr-3 py-2 bg-white border-gray-200"
            color="blue"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm">
            🔍
          </span>
        </div>
      )}
    </div>
  );
}
