"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { useStudentAssignments, StudentAssignment } from "@/hooks/use-student-assignments";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

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

  const statusConfig = {
    submitted: {
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
      label: "Đã nộp"
    },
    overdue: {
      color: "bg-rose-50 text-rose-700 border-rose-200",
      icon: AlertCircle,
      label: "Quá hạn"
    },
    upcoming: {
      color: "bg-sky-50 text-sky-700 border-sky-200",
      icon: Clock,
      label: "Đang diễn ra"
    },
    default: {
      color: "bg-slate-50 text-slate-700 border-slate-200",
      icon: FileText,
      label: "Chưa có hạn"
    }
  };

  const getStatusConfig = () => {
    if (assignment.status === "submitted") return statusConfig.submitted;
    if (isOverdue) return statusConfig.overdue;
    if (isUpcoming) return statusConfig.upcoming;
    return statusConfig.default;
  };

  const currentStatus = getStatusConfig();
  const StatusIcon = currentStatus.icon;

  return (
    <div 
      className="group relative bg-white/90 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onOpen()}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        assignment.status === "submitted"
          ? "from-emerald-400 to-emerald-500"
          : isOverdue
          ? "from-rose-400 to-rose-500"
          : isUpcoming
          ? "from-sky-400 to-sky-500"
          : "from-slate-300 to-slate-400"
      }`} />

      <div className="p-4 sm:p-5">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 line-clamp-2 mb-1">
              {assignment.title}
            </h3>
            {assignment.description && (
              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                {assignment.description}
              </p>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              assignment.type === "ESSAY"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-pink-50 text-pink-700 border-pink-200"
            }`}
          >
            <span>{assignment.type === "ESSAY" ? "📝" : "❓"}</span>
            <span>{assignment.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{currentStatus.label}</span>
          </span>
        </div>

        {/* Due date and countdown */}
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
            {timeRemaining && isUpcoming && (
              <span className="text-sky-600 font-medium whitespace-nowrap">
                ⏰ {timeRemaining}
              </span>
            )}
          </div>
        )}

        {/* Submission status */}
        {assignment.submission && (
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
        )}

        {isOverdue && !assignment.submission && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs sm:text-sm font-semibold text-rose-800">
                  Đã quá hạn nộp bài
                </p>
                <p className="text-xs sm:text-sm text-rose-700 mt-1">
                  Điểm: <span className="font-bold">0</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="flex items-center justify-end pt-2">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            size="sm"
            variant={assignment.submission ? "outline" : "default"}
            className="text-xs sm:text-sm"
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
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Lỗi tải danh sách bài tập</h3>
            <p className="text-sm mb-4 text-rose-600">{error}</p>
            <Button 
              onClick={() => fetchClassroomAssignments(classId)}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700"
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Bài tập của lớp
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          Danh sách các bài tập trong lớp học này. Hoàn thành và nộp bài đúng hạn để đạt điểm cao.
        </p>
      </div>

      {/* Assignment List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="bg-white/90 rounded-2xl border border-slate-100 p-4 sm:p-5 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-slate-100 rounded-full w-20" />
                <div className="h-6 bg-slate-100 rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white/90 rounded-2xl border border-slate-100 p-8 sm:p-12 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="text-5xl">📝</div>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
            Chưa có bài tập nào
          </h3>
          <p className="text-sm sm:text-base text-slate-600">
            Giáo viên chưa thêm bài tập nào vào lớp học này. Hãy quay lại sau để kiểm tra.
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