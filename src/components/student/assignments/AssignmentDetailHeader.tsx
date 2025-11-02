"use client";

import Badge from "@/components/ui/badge";
import { StudentAssignmentDetail } from "@/hooks/use-student-assignments";

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
  const isOverdue = dueDate && dueDate < now && !submission;
  const isUpcoming = dueDate && dueDate > now;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${
                assignment.type === "ESSAY"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-pink-50 text-pink-700 border-pink-200"
              }`}
            >
              <span>{assignment.type === "ESSAY" ? "📝" : "❓"}</span>
              <span>{assignment.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</span>
            </span>
            {submission && (
              <Badge className="bg-green-600 text-white">Đã nộp</Badge>
            )}
            {isOverdue && !submission && (
              <Badge className="bg-red-600 text-white">Quá hạn</Badge>
            )}
            {submission && submission.grade !== null && (
              <Badge className="bg-blue-600 text-white">Đã chấm</Badge>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-1">Lớp học</p>
          <p className="text-sm font-semibold text-gray-800">
            {assignment.classroom.icon} {assignment.classroom.name}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Giáo viên</p>
          <p className="text-sm font-semibold text-gray-800">
            {assignment.classroom.teacher.fullname}
          </p>
        </div>
        {dueDate && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Hạn nộp</p>
            <p className={`text-sm font-semibold ${
              isOverdue ? "text-red-600" : isUpcoming ? "text-blue-600" : "text-gray-800"
            }`}>
              {dueDate.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {assignment.type === "QUIZ" ? "Số câu hỏi" : "Trạng thái"}
          </p>
          <p className="text-sm font-semibold text-gray-800">
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


