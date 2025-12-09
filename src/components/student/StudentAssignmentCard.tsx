"use client";

import { useMemo } from "react";
import type { StudentAssignment } from "@/hooks/use-student-assignments";
import AssignmentStatusBadge from "@/components/student/AssignmentStatusBadge";
import { AssignmentTypeBadge } from "@/components/shared";
import DueCountdownChip from "@/components/student/DueCountdownChip";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface Props {
  assignment: StudentAssignment;
  onOpen?: () => void;
}

export default function StudentAssignmentCard({ assignment, onOpen }: Props) {
  const now = useMemo(() => new Date(), []);

  const effectiveDueRaw = assignment.type === "QUIZ" ? (assignment as any).lockAt || assignment.dueDate : assignment.dueDate;
  const dueDate = useMemo(() => (effectiveDueRaw ? new Date(effectiveDueRaw) : null), [effectiveDueRaw]);
  const isOverdue = !!(dueDate && dueDate < now && !assignment.submission);

  const submittedBlock = assignment.submission ? (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-emerald-800">
            Đã nộp: {new Date(assignment.submission.submittedAt).toLocaleDateString("vi-VN")}
          </p>
          {assignment.submission.grade !== null && (
            <p className="text-xs sm:text-sm text-emerald-700 mt-1">
              Điểm: <span className="font-bold">{assignment.submission.grade}</span>
              {assignment.submission.feedback && (
                <span className="text-emerald-600"> • {assignment.submission.feedback}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const overdueBlock = isOverdue ? (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs sm:text-sm font-semibold text-rose-800">Đã quá hạn nộp bài</p>
          <p className="text-xs sm:text-sm text-rose-700 mt-1">
            Điểm: <span className="font-bold">0</span>
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full text-left relative bg-white/90 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
      aria-label={`Mở bài tập ${assignment.title}`}
      role="listitem"
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          assignment.status === "submitted"
            ? "from-emerald-400 to-emerald-500"
            : isOverdue
            ? "from-rose-400 to-rose-500"
            : dueDate && dueDate > now
            ? "from-sky-400 to-sky-500"
            : "from-slate-300 to-slate-400"
        }`}
      />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 line-clamp-2 mb-1">{assignment.title}</h3>
            {assignment.description && (
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{assignment.description}</p>
            )}
            {assignment.classroom && (
              <p className="mt-1 text-xs sm:text-[13px] text-slate-500">
                Lớp:
                <span className="ml-1 font-medium text-slate-700">{assignment.classroom.name}</span>
                {assignment.classroom.teacher?.fullname && (
                  <span className="ml-1">
                    • GV:
                    <span className="ml-1 font-medium text-slate-700">{assignment.classroom.teacher.fullname}</span>
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <AssignmentTypeBadge type={assignment.type as any} variant="student" />
          <AssignmentStatusBadge status={assignment.status} />
        </div>

        {dueDate && (
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {dueDate.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <DueCountdownChip dueDate={effectiveDueRaw as any} />
          </div>
        )}

        {submittedBlock}
        {overdueBlock}

        <div className="flex items-center justify-end pt-2">
          <span className="text-xs sm:text-sm text-green-700 font-semibold group-hover:underline">Mở chi tiết</span>
        </div>
      </div>
    </button>
  );
}
