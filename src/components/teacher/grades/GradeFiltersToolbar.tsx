"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type GradeSortKey = "recent" | "due" | "grade";
export type GradeStatus = "all" | "graded" | "ungraded";

function parseGradeStatus(value: string): GradeStatus {
  if (value === "all" || value === "graded" || value === "ungraded") return value;
  return "all";
}

function parseGradeSortKey(value: string): GradeSortKey {
  if (value === "recent" || value === "due" || value === "grade") return value;
  return "recent";
}

interface GradeFiltersToolbarProps {
  assignments: Array<{ id: string; title: string }>;
  assignmentId: string | "all";
  onAssignmentChange: (id: string | "all") => void;
  status: GradeStatus;
  onStatusChange: (s: GradeStatus) => void;
  sortKey: GradeSortKey;
  onSortChange: (k: GradeSortKey) => void;
  search: string;
  onSearchChange: (q: string) => void;
  className?: string;
}

export default function GradeFiltersToolbar({
  assignments,
  assignmentId,
  onAssignmentChange,
  status,
  onStatusChange,
  sortKey,
  onSortChange,
  search,
  onSearchChange,
  className,
}: GradeFiltersToolbarProps) {
  const [localQ, setLocalQ] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localQ), 300);
    return () => clearTimeout(t);
  }, [localQ, onSearchChange]);

  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)}>
      <div className="relative w-full md:max-w-xs lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Tìm theo học sinh hoặc bài tập..."
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          className="h-11 w-full pl-9"
          color="blue"
          aria-label="Tìm kiếm bảng điểm"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
        <Select
          value={assignmentId}
          onChange={(e) => {
            const v = e.target.value;
            onAssignmentChange(v === "all" ? "all" : v);
          }}
          color="blue"
          className="h-11 min-w-[200px]"
          aria-label="Lọc theo bài tập"
        >
          <option value="all">Tất cả bài tập</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>{a.title}</option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) => onStatusChange(parseGradeStatus(e.target.value))}
          color="blue"
          className="h-11 min-w-[160px]"
          aria-label="Lọc theo trạng thái chấm"
        >
          <option value="all">Tất cả</option>
          <option value="graded">Đã chấm</option>
          <option value="ungraded">Chưa chấm</option>
        </Select>

        <Select
          value={sortKey}
          onChange={(e) => onSortChange(parseGradeSortKey(e.target.value))}
          color="blue"
          className="h-11 min-w-[180px]"
          aria-label="Sắp xếp"
        >
          <option value="recent">Gần nhất</option>
          <option value="due">Hạn nộp</option>
          <option value="grade">Điểm cao</option>
        </Select>
      </div>
    </div>
  );
}
