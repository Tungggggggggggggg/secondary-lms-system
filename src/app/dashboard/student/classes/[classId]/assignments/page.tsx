"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { useStudentAssignments, StudentAssignment } from "@/hooks/use-student-assignments";
import { Button } from "@/components/ui/button";

/**
 * Component hiển thị assignment card cho student
 */
function AssignmentCard({
  assignment,
  onOpen,
}: {
  assignment: StudentAssignment;
  onOpen: () => void;
}) {
  const now = useMemo(() => new Date(), []);

  const effectiveDueRaw = assignment.type === "QUIZ" ? (assignment as any).lockAt || assignment.dueDate : assignment.dueDate;
  const dueDate = useMemo(() => (effectiveDueRaw ? new Date(effectiveDueRaw) : null), [effectiveDueRaw]);
  const isUpcoming = useMemo(() => !!(dueDate && dueDate > now), [dueDate, now]);
  const isOverdue = !!(dueDate && dueDate < now && !assignment.submission);

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
      onClick={() => onOpen()}
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

        {isOverdue && !assignment.submission && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800">
              ⚠️ Đã quá hạn nộp bài
            </p>
            <p className="text-sm text-red-700 mt-1">
              Điểm: <span className="font-bold">0</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            variant={assignment.submission ? "outline" : "default"}
          >
            {assignment.submission ? "Xem bài nộp" : (isOverdue ? "Xem chi tiết" : "Làm bài tập")}
          </Button>
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
  } = useStudentAssignments();

  // Load assignments khi component mount
  useEffect(() => {
    if (classId) {
      fetchClassroomAssignments(classId);
    }
  }, [classId, fetchClassroomAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    const filtered = [...assignments];

    // Sort: Mới cập nhật/ tạo gần nhất trước
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [assignments]);

  // Điều hướng sang trang chi tiết bài tập
  const handleOpenAssignment = (assignmentId: string) => {
    router.push(`/dashboard/student/assignments/${assignmentId}`);
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
              onOpen={() => handleOpenAssignment(assignment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}