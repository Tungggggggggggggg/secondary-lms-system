"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type AssignmentStatusFilter = "all" | "active" | "overdue" | "upcoming";
export type AssignmentTypeFilter = "all" | "ESSAY" | "QUIZ";
export type AssignmentSortKey = "newest" | "due" | "submissions";

interface AssignmentFiltersToolbarProps {
  status: AssignmentStatusFilter;
  onStatusChange: (status: AssignmentStatusFilter) => void;
  type: AssignmentTypeFilter;
  onTypeChange: (type: AssignmentTypeFilter) => void;
  sortKey: AssignmentSortKey;
  onSortChange: (sortKey: AssignmentSortKey) => void;
  search: string;
  onSearchChange: (q: string) => void;
  className?: string;
}

export default function AssignmentFiltersToolbar({
  status,
  onStatusChange,
  type,
  onTypeChange,
  sortKey,
  onSortChange,
  search,
  onSearchChange,
  className,
}: AssignmentFiltersToolbarProps) {
  const [localQ, setLocalQ] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localQ), 300);
    return () => clearTimeout(t);
  }, [localQ, onSearchChange]);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm bài tập..."
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="h-11 w-full pl-9"
            color="blue"
            aria-label="Tìm kiếm bài tập"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
          <Select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as AssignmentTypeFilter)}
            color="blue"
            className="h-11 min-w-[160px]"
            aria-label="Lọc theo loại bài tập"
          >
            <option value="all">Tất cả loại</option>
            <option value="ESSAY">Tự luận</option>
            <option value="QUIZ">Trắc nghiệm</option>
          </Select>

          <Select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as AssignmentSortKey)}
            color="blue"
            className="h-11 min-w-[180px]"
            aria-label="Sắp xếp bài tập"
          >
            <option value="newest">Mới nhất</option>
            <option value="due">Hạn nộp (gần nhất)</option>
            <option value="submissions">Nhiều bài nộp</option>
          </Select>
        </div>
      </div>

      <Tabs value={status} onValueChange={(v) => onStatusChange(v as AssignmentStatusFilter)}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-xl bg-blue-100/60 text-blue-700">
          <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">
            Tất cả
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">
            Đang diễn ra
          </TabsTrigger>
          <TabsTrigger value="overdue" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">
            Đã hết hạn
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:text-blue-900">
            Sắp tới
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
