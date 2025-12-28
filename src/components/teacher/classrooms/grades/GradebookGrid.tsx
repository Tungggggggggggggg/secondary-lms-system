"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type GradebookStudent = {
  id: string;
  fullname: string;
  email: string;
};

export type GradebookAssignment = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
};

export type GradebookCell = {
  studentId: string;
  assignmentId: string;
  submissionId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
};

type SelectedCell = {
  student: GradebookStudent;
  assignment: GradebookAssignment;
  cell: GradebookCell | null;
  status: "graded" | "submitted" | "missing" | "overdue";
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function GradebookGrid({
  students,
  assignments,
  cells,
}: {
  students: GradebookStudent[];
  assignments: GradebookAssignment[];
  cells: GradebookCell[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, GradebookCell>();
    cells.forEach((c) => map.set(`${c.studentId}:${c.assignmentId}`, c));
    return map;
  }, [cells]);

  const now = useMemo(() => new Date(), []);

  const resolveStatus = (cell: GradebookCell | null, assignment: GradebookAssignment) => {
    if (cell?.grade !== null) return "graded" as const;
    if (cell?.submittedAt) return "submitted" as const;
    const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
    if (due && due.getTime() < now.getTime()) return "overdue" as const;
    return "missing" as const;
  };

  const getCellStyle = (status: SelectedCell["status"], grade: number | null) => {
    if (status === "graded") {
      if (grade === null) return "bg-emerald-50 text-emerald-800 border-emerald-200";
      if (grade >= 5) return "bg-emerald-50 text-emerald-800 border-emerald-200";
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (status === "submitted") return "bg-amber-50 text-amber-800 border-amber-200";
    if (status === "overdue") return "bg-rose-50/70 text-rose-800 border-rose-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getCellLabel = (status: SelectedCell["status"], grade: number | null) => {
    if (status === "graded") return grade !== null ? grade.toFixed(1) : "—";
    if (status === "submitted") return "Chờ";
    if (status === "overdue") return "0";
    return "—";
  };

  const openCell = (student: GradebookStudent, assignment: GradebookAssignment) => {
    const cell = cellMap.get(`${student.id}:${assignment.id}`) || null;
    const status = resolveStatus(cell, assignment);
    setSelected({ student, assignment, cell, status });
    setOpen(true);
  };

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="max-h-[65vh] overflow-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky top-0 left-0 z-40 bg-slate-50 border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 min-w-[260px]"
              >
                Học sinh
              </th>
              {assignments.map((a) => (
                <th
                  key={a.id}
                  scope="col"
                  className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200 px-3 py-3 text-left text-sm font-semibold text-slate-900 min-w-[160px]"
                  title={a.title}
                >
                  <div className="leading-tight">
                    <div className="truncate">{a.title}</div>
                    <div className="mt-1 text-xs font-medium text-slate-600">Hạn: {formatDate(a.dueDate)}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50">
                <th
                  scope="row"
                  className="sticky left-0 z-20 bg-white border-b border-slate-100 border-r border-slate-200 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{s.fullname}</div>
                    <div className="truncate text-xs text-slate-500">{s.email}</div>
                  </div>
                </th>
                {assignments.map((a) => {
                  const cell = cellMap.get(`${s.id}:${a.id}`) || null;
                  const status = resolveStatus(cell, a);
                  const cls = getCellStyle(status, cell?.grade ?? null);
                  const label = getCellLabel(status, cell?.grade ?? null);
                  const aria = `${s.fullname} - ${a.title}: ${status === "graded" ? "Đã chấm" : status === "submitted" ? "Chờ chấm" : status === "overdue" ? "Quá hạn" : "Chưa nộp"}`;

                  return (
                    <td key={a.id} className="border-b border-slate-100 px-2 py-2">
                      <button
                        type="button"
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${cls}`}
                        aria-label={aria}
                        onClick={() => openCell(s, a)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tabular-nums">{label}</span>
                          <span className="text-[11px] font-semibold opacity-80">
                            {status === "graded"
                              ? "Đã chấm"
                              : status === "submitted"
                              ? "Chờ"
                              : status === "overdue"
                              ? "Quá hạn"
                              : "—"}
                          </span>
                        </div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setSelected(null);
          }}
        >
          <DialogContent onClose={() => setOpen(false)} className="max-w-xl">
            <DialogHeader variant="teacher">
              <DialogTitle variant="teacher">Chi tiết điểm</DialogTitle>
              <DialogDescription variant="teacher">
                {selected.student.fullname} - {selected.assignment.title}
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-3 text-sm text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Trạng thái</div>
                  <div className="mt-1 font-semibold">
                    {selected.status === "graded"
                      ? "Đã chấm"
                      : selected.status === "submitted"
                      ? "Chờ chấm"
                      : selected.status === "overdue"
                      ? "Quá hạn"
                      : "Chưa nộp"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Hạn nộp</div>
                  <div className="mt-1 font-semibold">{formatDateTime(selected.assignment.dueDate)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Thời gian nộp</div>
                  <div className="mt-1 font-semibold">{formatDateTime(selected.cell?.submittedAt ?? null)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Điểm</div>
                  <div className="mt-1 font-semibold">
                    {selected.cell?.grade !== null && selected.cell?.grade !== undefined
                      ? selected.cell.grade.toFixed(1)
                      : selected.status === "overdue"
                      ? "0"
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-600">Nhận xét</div>
                <div className="mt-2 whitespace-pre-line text-slate-800 max-h-[30vh] overflow-y-auto">
                  {selected.cell?.feedback ? selected.cell.feedback : "—"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
