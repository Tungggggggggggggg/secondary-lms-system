"use client";

import Badge from "@/components/ui/badge";
import { StudentAssignmentDetail } from "@/hooks/use-student-assignments";
import { BookOpen, ArrowRight, CheckCircle2, BadgeCheck } from "lucide-react";
import AssignmentTypeBadge from "@/components/student/AssignmentTypeBadge";
import DueCountdownChip from "@/components/student/DueCountdownChip";

interface AssignmentDetailHeaderProps {
  assignment: StudentAssignmentDetail;
  submission?: {
    id: string;
    submittedAt: string;
    grade: number | null;
    feedback: string | null;
  } | null;
}

/**
 * Component hiển thị header với thông tin assignment
 */
export default function AssignmentDetailHeader({
  assignment,
  submission,
}: AssignmentDetailHeaderProps) {
  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const openAt = (assignment as any).openAt ? new Date((assignment as any).openAt) : null;
  const lockAt = (assignment as any).lockAt ? new Date((assignment as any).lockAt) : (dueDate || null);
  const timeLimitMinutes = (assignment as any).timeLimitMinutes as number | null | undefined;
  const isOverdue = dueDate && dueDate < now && !submission;
  const isUpcoming = dueDate && dueDate > now;
  const effectiveDue = assignment.type === "QUIZ" ? (lockAt || dueDate) : dueDate;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <AssignmentTypeBadge type={assignment.type as any} />
            {submission && (
              <Badge className="bg-green-600 text-white shadow-sm ring-1 ring-green-600/15 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã nộp
              </Badge>
            )}
            {submission && (
              <span className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
                Lần nộp #{(submission as any).attempt ?? 1}
              </span>
            )}
            {isOverdue && !submission && (
              <Badge className="bg-red-600 text-white">Quá hạn</Badge>
            )}
            {submission && submission.grade !== null && (
              <Badge className="bg-blue-600 text-white shadow-sm ring-1 ring-blue-600/15 inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5" />
                Đã chấm
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            {assignment.title}
          </h1>
          {assignment.description && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Mô tả:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-green-200 bg-green-50/30 overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-y divide-green-100 md:divide-y-0 md:divide-x">
        <div className="p-4">
          <p className="text-xs text-green-700 mb-1">Lớp học</p>
          <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-green-600" /> {assignment.classroom?.name}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs text-green-700 mb-1">Giáo viên</p>
          <p className="text-sm font-semibold text-gray-900">
            {assignment.classroom?.teacher?.fullname ?? "Giáo viên"}
          </p>
        </div>
        {(openAt || lockAt) && (
          <div className="p-4">
            <p className="text-xs text-green-700 mb-1">Khung thời gian</p>
            <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
              <span>{openAt ? openAt.toLocaleString("vi-VN") : "Hiện tại"}</span>
              <ArrowRight className="h-4 w-4 text-green-600" />
              <span>{lockAt ? lockAt.toLocaleString("vi-VN") : "Không giới hạn"}</span>
            </p>
          </div>
        )}
        {typeof timeLimitMinutes === "number" && timeLimitMinutes > 0 && (
          <div className="p-4">
            <p className="text-xs text-green-700 mb-1">Giới hạn thời gian</p>
            <p className="text-sm font-semibold text-gray-900">{timeLimitMinutes} phút</p>
          </div>
        )}
        {effectiveDue && (
          <div className="p-4">
            <p className="text-xs text-green-700 mb-1">Tới hạn</p>
            <div className="text-sm font-semibold"><DueCountdownChip dueDate={effectiveDue} /></div>
          </div>
        )}
        <div className="p-4">
          <p className="text-xs text-green-700 mb-1">
            {assignment.type === "QUIZ" ? "Số câu hỏi" : "Trạng thái"}
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {assignment.type === "QUIZ"
              ? `${assignment.questions.length} câu`
              : submission
              ? "Đã nộp"
              : "Chưa nộp"}
          </p>
        </div>
      </div>

      {submission && submission.grade !== null && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✓ Đã nộp: {new Date(submission.submittedAt).toLocaleDateString("vi-VN")}
                </p>
                <p className="text-lg font-bold text-green-700">
                  Điểm: {submission.grade.toFixed(1)}/10
                </p>
                {submission.feedback && (
                  <p className="text-sm text-green-700 mt-2">
                    Nhận xét: {submission.feedback}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


