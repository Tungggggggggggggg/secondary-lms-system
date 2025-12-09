"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type StudentStatusFilter = "all" | "active" | "warning" | "inactive";
export type StudentSortKey = "name" | "grade" | "attendance";

interface ClassroomOption {
  id: string;
  name: string;
  code: string;
}

interface StudentFiltersToolbarProps {
  classrooms: ClassroomOption[];
  selectedClassId: string;
  onClassChange: (id: string) => void;
  status: StudentStatusFilter;
  onStatusChange: (status: StudentStatusFilter) => void;
  sortKey: StudentSortKey;
  onSortChange: (sortKey: StudentSortKey) => void;
  search: string;
  onSearchChange: (query: string) => void;
  className?: string;
  onReset?: () => void;
}

export default function StudentFiltersToolbar({
  classrooms,
  selectedClassId,
  onClassChange,
  status,
  onStatusChange,
  sortKey,
  onSortChange,
  search,
  onSearchChange,
  className,
  onReset,
}: StudentFiltersToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className={cn("flex flex-col gap-4 mb-6", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            className="h-11 w-full pl-9"
            color="blue"
            aria-label="Tìm kiếm học sinh"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          <Select
            value={selectedClassId}
            onChange={(event) => onClassChange(event.target.value)}
            color="blue"
            className="min-w-[180px] h-11"
            aria-label="Lọc theo lớp học"
          >
            <option value="all">Tất cả lớp</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name} ({classroom.code})
              </option>
            ))}
          </Select>

          <Select
            value={sortKey}
            onChange={(event) => onSortChange(event.target.value as StudentSortKey)}
            color="blue"
            className="h-11 min-w-[180px]"
            aria-label="Sắp xếp học sinh"
          >
            <option value="name">Sắp xếp theo tên</option>
            <option value="grade">Sắp xếp theo điểm</option>
            <option value="attendance">Sắp xếp theo chuyên cần</option>
          </Select>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 h-11 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              aria-label="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          )}
        </div>
      </div>

      <Tabs
        value={status}
        onValueChange={(value) => onStatusChange(value as StudentStatusFilter)}
      >
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-xl bg-blue-100/60 text-blue-700">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-900"
          >
            Tất cả
          </TabsTrigger>
          <TabsTrigger
            value="active"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-900"
          >
            Tốt
          </TabsTrigger>
          <TabsTrigger
            value="warning"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-900"
          >
            Cần chú ý
          </TabsTrigger>
          <TabsTrigger
            value="inactive"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-900"
          >
            Không hoạt động
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
