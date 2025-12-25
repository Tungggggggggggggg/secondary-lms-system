"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { SlidersHorizontal } from "lucide-react";

export type AssignmentQuickStatus = "all" | "active" | "completed" | "draft";

interface ClassroomOption {
  id: string;
  name: string;
}

interface AdvancedFiltersPopoverProps {
  status: AssignmentQuickStatus;
  onStatusChange: (s: AssignmentQuickStatus) => void;
  classId: string;
  onClassChange: (id: string) => void;
  classrooms?: ClassroomOption[];
}

export default function AdvancedFiltersPopover({ status, onStatusChange, classId, onClassChange, classrooms = [] }: AdvancedFiltersPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 h-11 rounded-xl border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          aria-label="Bộ lọc nâng cao"
        >
          <SlidersHorizontal className="h-4 w-4" /> Bộ lọc nâng cao
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Trạng thái</div>
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value as AssignmentQuickStatus)}
              color="blue"
              className="h-10 w-full rounded-lg"
              aria-label="Lọc theo trạng thái bài tập"
            >
              <option value="all">Tất cả bài tập</option>
              <option value="active">Đang diễn ra</option>
              <option value="completed">Đã kết thúc</option>
              <option value="draft">Bản nháp</option>
            </Select>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Lớp</div>
            <Select
              value={classId}
              onChange={(e) => onClassChange(e.target.value)}
              color="blue"
              className="h-10 w-full rounded-lg"
              aria-label="Lọc theo lớp học"
            >
              <option value="all">Tất cả lớp</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
