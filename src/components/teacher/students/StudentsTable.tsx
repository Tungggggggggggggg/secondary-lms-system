"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { StudentListItem } from "@/components/teacher/students/StudentList";

type Props = {
  students: StudentListItem[];
  selectable?: boolean;
  selectedIds?: string[];
  onToggleOne?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
};

export default function StudentsTable({ students, selectable = true, selectedIds = [], onToggleOne, onToggleAll }: Props) {
  const allSelected = selectable && students.length > 0 && students.every((s) => selectedIds.includes(s.id));
  const indeterminate = selectable && selectedIds.length > 0 && !allSelected;

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!selectable) return;
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, selectedIds.length, selectable]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-blue-50 sticky top-0 z-10">
          <tr className="text-left text-blue-900">
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  aria-label="Chọn tất cả"
                />
              </th>
            )}
            <th className="px-4 py-3 font-semibold">Học sinh</th>
            <th className="px-4 py-3 font-semibold">Lớp</th>
            <th className="px-4 py-3 font-semibold">Điểm TB</th>
            <th className="px-4 py-3 font-semibold">Chuyên cần</th>
            <th className="px-4 py-3 font-semibold">Bài đã nộp</th>
            <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const checked = selectable && selectedIds.includes(s.id);
            return (
              <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleOne?.(s.id)}
                      aria-label={`Chọn ${s.fullname}`}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center">
                      {s.avatarInitial}
                    </div>
                    <div className="font-medium text-slate-800">{s.fullname}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {s.classroomCode} · {s.classroomName}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {s.averageGrade !== null ? s.averageGrade.toFixed(1) : "-"}
                </td>
                <td className="px-4 py-3 font-semibold text-blue-700">{Math.round(s.submissionRate)}%</td>
                <td className="px-4 py-3">
                  {s.submittedCount}/{s.totalAssignments}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/teacher/classrooms/${s.classroomId}/people/${s.id}`}
                    className="inline-flex items-center rounded-lg border border-blue-200 px-3 py-1.5 text-blue-700 hover:bg-blue-50 text-xs font-medium"
                    aria-label={`Xem chi tiết ${s.fullname}`}
                  >
                    Xem
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


