"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeacherSubmission } from "@/hooks/use-teacher-submissions";

interface SubmissionCardProps {
  submission: TeacherSubmission;
  assignmentType: "ESSAY" | "QUIZ";
  onGrade: (submission: TeacherSubmission) => void;
}

/**
 * Card hiển thị một submission
 */
export default function SubmissionCard({
  submission,
  assignmentType,
  onGrade,
}: SubmissionCardProps) {
  const isGraded = submission.grade !== null;
  const submittedDate = new Date(submission.submittedAt);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-gray-800">
              {submission.student.fullname}
            </h3>
            <Badge className="bg-gray-200 text-gray-700">Lần nộp #{(submission as any).attempt ?? 1}</Badge>
            {isGraded && (
              <Badge className="bg-green-600 text-white">Đã chấm</Badge>
            )}
            {!isGraded && (
              <Badge className="bg-yellow-500 text-white">Chưa chấm</Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            {submission.student.email}
          </p>
          <p className="text-xs text-gray-500">
            Nộp lúc: {submittedDate.toLocaleString("vi-VN")}
          </p>
        </div>
        {isGraded && (
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">
              {submission.grade?.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">điểm</div>
          </div>
        )}
      </div>

      {/* Nội dung bài nộp (preview) */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Nội dung:</p>
        <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
          {assignmentType === "ESSAY" ? (
            <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap">
              {submission.content}
            </p>
          ) : (
            <p className="text-sm text-gray-600 italic">
              Bài trắc nghiệm (xem chi tiết để chấm điểm)
            </p>
          )}
        </div>
      </div>

      {/* Feedback */}
      {submission.feedback && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-1">Nhận xét:</p>
          <p className="text-sm text-blue-700 whitespace-pre-wrap">
            {submission.feedback}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
        <Button
          onClick={() => onGrade(submission)}
          variant={isGraded ? "outline" : "default"}
        >
          {isGraded ? "Xem/Sửa điểm" : "Chấm bài"}
        </Button>
      </div>
    </div>
  );
}

