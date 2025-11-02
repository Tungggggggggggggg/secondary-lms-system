"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentAssignments, StudentAssignment } from "@/hooks/use-student-assignments";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";

/**
 * Component hiển thị assignment card cho student
 */
function AssignmentCard({
  assignment,
  onSubmit,
}: {
  assignment: StudentAssignment;
  onSubmit: () => void;
}) {
  const router = useRouter();
  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const isOverdue = dueDate && dueDate < now && !assignment.submission;
  const isUpcoming = dueDate && dueDate > now;

  // Tính toán countdown
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  
  useEffect(() => {
    if (!dueDate || !isUpcoming) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const diff = dueDate.getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeRemaining("Đã hết hạn");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} ngày ${hours} giờ`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} giờ ${minutes} phút`);
      } else {
        setTimeRemaining(`${minutes} phút`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update mỗi phút

    return () => clearInterval(interval);
  }, [dueDate, isUpcoming]);

  const statusColor =
    assignment.status === "submitted"
      ? "bg-green-100 text-green-600"
      : isOverdue
      ? "bg-red-100 text-red-600"
      : isUpcoming
      ? "bg-blue-100 text-blue-600"
      : "bg-gray-100 text-gray-600";

  const statusText =
    assignment.status === "submitted"
      ? "Đã nộp"
      : isOverdue
      ? "Quá hạn"
      : isUpcoming
      ? "Đang diễn ra"
      : "Chưa có hạn";

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/student/assignments/${assignment.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {assignment.title}
          </h3>
          {assignment.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {assignment.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
              assignment.type === "ESSAY"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-pink-50 text-pink-700 border-pink-200"
            }`}
          >
            <span>{assignment.type === "ESSAY" ? "📝" : "❓"}</span>
            <span>{assignment.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</span>
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {dueDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              📅 Hạn nộp:{" "}
              <span className="font-medium text-gray-800">
                {dueDate.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            {timeRemaining && isUpcoming && (
              <span className="text-blue-600 font-medium">
                ⏰ Còn lại: {timeRemaining}
              </span>
            )}
          </div>
        )}

        {assignment.submission && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  ✓ Đã nộp: {new Date(assignment.submission.submittedAt).toLocaleDateString("vi-VN")}
                </p>
                {assignment.submission.grade !== null && (
                  <p className="text-sm text-green-700 mt-1">
                    Điểm: <span className="font-bold">{assignment.submission.grade}</span>
                    {assignment.submission.feedback && (
                      <span className="ml-2">• {assignment.submission.feedback}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">
              ⚠️ Đã quá hạn nộp bài
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          {assignment.submission ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/student/assignments/${assignment.id}`);
              }}
              variant="outline"
            >
              Xem bài nộp
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSubmit();
              }}
              disabled={isOverdue}
            >
              {isOverdue ? "Đã quá hạn" : "Làm bài tập"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Trang bài tập của lớp học (student view)
 */
export default function StudentClassroomAssignmentsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const router = useRouter();

  const {
    assignments,
    isLoading,
    error,
    fetchClassroomAssignments,
    submitAssignment,
  } = useStudentAssignments();

  const { toast } = useToast();
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // Load assignments khi component mount
  useEffect(() => {
    if (classId) {
      fetchClassroomAssignments(classId);
    }
  }, [classId, fetchClassroomAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    // Sort: Mới thêm nhất trước
    filtered.sort((a, b) => {
      const dateA = new Date(a.addedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.addedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [assignments]);

  // Xử lý mở dialog submit
  const handleOpenSubmitDialog = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setSubmissionContent("");
    setShowSubmitDialog(true);
  };

  // Xử lý submit assignment
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !submissionContent.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập nội dung bài làm",
        variant: "destructive",
      });
      return;
    }

    const result = await submitAssignment(selectedAssignment, {
      content: submissionContent.trim(),
    });

    if (result) {
      toast({
        title: "Nộp bài thành công",
        description: "Bài tập của bạn đã được nộp",
        variant: "success",
      });
      setShowSubmitDialog(false);
      setSelectedAssignment(null);
      setSubmissionContent("");
      // Refresh assignments
      fetchClassroomAssignments(classId);
    } else {
      toast({
        title: "Nộp bài thất bại",
        description: "Không thể nộp bài tập. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-semibold mb-2">Lỗi tải danh sách bài tập</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={() => fetchClassroomAssignments(classId)}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bài tập của lớp</h2>
          <p className="text-gray-600">
            Danh sách các bài tập trong lớp học này
          </p>
        </div>
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Đang tải danh sách bài tập...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Chưa có bài tập nào
          </h3>
          <p className="text-gray-600">
            Giáo viên chưa thêm bài tập nào vào lớp học này
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onSubmit={() => handleOpenSubmitDialog(assignment.id)}
            />
          ))}
        </div>
      )}

      {/* Submit Dialog */}
      {showSubmitDialog && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Nộp bài tập</h2>
              <button
                onClick={() => {
                  setShowSubmitDialog(false);
                  setSelectedAssignment(null);
                  setSubmissionContent("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nội dung bài làm <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Nhập nội dung bài làm của bạn..."
                  rows={10}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSubmitDialog(false);
                  setSelectedAssignment(null);
                  setSubmissionContent("");
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSubmitAssignment}
                disabled={!submissionContent.trim() || isLoading}
              >
                {isLoading ? "Đang nộp..." : "Nộp bài"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}