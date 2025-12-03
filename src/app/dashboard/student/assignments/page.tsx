// src/app/student/assignments/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";
import StatsGrid, { type StatItem } from "@/components/shared/StatsGrid";
import { useStudentAssignments, StudentAssignment } from "@/hooks/use-student-assignments";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

/**
 * Component hiển thị assignment card
 */
function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);

  const openAt = (assignment as any).openAt ? new Date((assignment as any).openAt) : null;
  const effectiveDueRaw =
    assignment.type === "QUIZ"
      ? (assignment as any).lockAt || assignment.dueDate
      : assignment.dueDate;
  const dueDate = useMemo(
    () => (effectiveDueRaw ? new Date(effectiveDueRaw) : null),
    [effectiveDueRaw]
  );
  const lockAt = (assignment as any).lockAt
    ? new Date((assignment as any).lockAt)
    : dueDate || null;

  const isOverdue = !!(dueDate && dueDate < now && !assignment.submission);
  const isUpcoming = useMemo(() => !!(dueDate && dueDate > now), [dueDate, now]);
  const beforeStart = !!(openAt && now < openAt);
  const afterEnd = !!(lockAt && now > lockAt);

  // Countdown tới hạn nộp
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
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60)
      );

      if (days > 0) {
        setTimeRemaining(`${days} ngày ${hours} giờ`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} giờ ${minutes} phút`);
      } else {
        setTimeRemaining(`${minutes} phút`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [dueDate, isUpcoming]);

  const statusConfig = {
    submitted: {
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
      label: "Đã nộp",
    },
    overdue: {
      color: "bg-rose-50 text-rose-700 border-rose-200",
      icon: AlertCircle,
      label: "Quá hạn",
    },
    upcoming: {
      color: "bg-sky-50 text-sky-700 border-sky-200",
      icon: Clock,
      label: "Đang diễn ra",
    },
    default: {
      color: "bg-slate-50 text-slate-700 border-slate-200",
      icon: FileText,
      label: "Chưa có hạn",
    },
  } as const;

  const getStatusConfig = () => {
    if (assignment.status === "submitted") return statusConfig.submitted;
    if (isOverdue) return statusConfig.overdue;
    if (isUpcoming) return statusConfig.upcoming;
    return statusConfig.default;
  };

  const currentStatus = getStatusConfig();
  const StatusIcon = currentStatus.icon;

  const handleOpen = () => {
    router.push(`/dashboard/student/assignments/${assignment.id}`);
  };

  return (
    <div
      className="group relative bg-white/90 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={handleOpen}
    >
      {/* Top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          assignment.status === "submitted"
            ? "from-emerald-400 to-emerald-500"
            : isOverdue
            ? "from-rose-400 to-rose-500"
            : isUpcoming
            ? "from-sky-400 to-sky-500"
            : "from-slate-300 to-slate-400"
        }`}
      />

      <div className="p-4 sm:p-5">
        {/* Header with title and description */}
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
            {assignment.classroom && (
              <p className="mt-1 text-xs sm:text-[13px] text-slate-500">
                Lớp:
                <span className="ml-1 font-medium text-slate-700">
                  {assignment.classroom.name}
                </span>
                {assignment.classroom.teacher?.fullname && (
                  <span className="ml-1">
                    • GV:
                    <span className="ml-1 font-medium text-slate-700">
                      {assignment.classroom.teacher.fullname}
                    </span>
                  </span>
                )}
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
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${currentStatus.color}`}
          >
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
                  Đã nộp: {" "}
                  {new Date(
                    assignment.submission.submittedAt
                  ).toLocaleDateString("vi-VN")}
                </p>
                {assignment.submission.grade !== null && (
                  <p className="text-xs sm:text-sm text-emerald-700 mt-1">
                    Điểm: {" "}
                    <span className="font-bold">
                      {assignment.submission.grade}
                    </span>
                    {assignment.submission.feedback && (
                      <span className="text-emerald-600">
                        {" "}
                        • {assignment.submission.feedback}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Overdue status */}
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
              handleOpen();
            }}
            size="sm"
            variant={assignment.submission ? "outline" : "default"}
            className="text-xs sm:text-sm"
            disabled={beforeStart || afterEnd}
          >
            {assignment.submission
              ? "Xem bài nộp"
              : beforeStart
              ? "Chưa mở"
              : afterEnd
              ? "Đã kết thúc"
              : isOverdue
              ? "Đã quá hạn"
              : "Làm bài tập"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang bài tập của tôi (student view)
 */
export default function AssignmentsPage() {
  const router = useRouter();
  const {
    assignments,
    isLoading,
    error,
    fetchAllAssignments,
  } = useStudentAssignments();

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "submitted" | "overdue"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load assignments khi component mount
  useEffect(() => {
    fetchAllAssignments();
  }, [fetchAllAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    // Filter theo status
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.classroom?.name.toLowerCase().includes(query)
      );
    }

    // Sort: Sắp hết hạn trước, sau đó mới nhất
    filtered.sort((a, b) => {
      const now = new Date();
      const dueARaw = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
      const dueBRaw = b.type === "QUIZ" ? (b as any).lockAt || b.dueDate : b.dueDate;
      const dueA = dueARaw ? new Date(dueARaw).getTime() : 0;
      const dueB = dueBRaw ? new Date(dueBRaw).getTime() : 0;

      // Ưu tiên: Chưa nộp và sắp hết hạn > Đã nộp > Quá hạn
      if (!a.submission && dueA > 0 && dueA < now.getTime() + 24 * 60 * 60 * 1000) {
        if (b.submission || dueB === 0 || dueB > now.getTime() + 24 * 60 * 60 * 1000) return -1;
      }
      if (!b.submission && dueB > 0 && dueB < now.getTime() + 24 * 60 * 60 * 1000) {
        if (a.submission || dueA === 0 || dueA > now.getTime() + 24 * 60 * 60 * 1000) return 1;
      }

      // Sau đó sort theo due date gần nhất
      if (dueA > 0 && dueB > 0) {
        return dueA - dueB;
      }

      // Cuối cùng sort theo created date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [assignments, statusFilter, searchQuery]);

  // Tính toán statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const pending = assignments.filter((a) => a.status === "pending").length;
    const submitted = assignments.filter((a) => a.status === "submitted").length;
    const overdue = assignments.filter((a) => a.status === "overdue").length;

    return { total, pending, submitted, overdue };
  }, [assignments]);

  const statItems: StatItem[] = useMemo(
    () => [
      {
        icon: <FileText className="h-5 w-5" />,
        color: "from-indigo-500 to-sky-500",
        label: "Tổng bài tập",
        value: String(stats.total),
        subtitle: "Từ tất cả các lớp bạn tham gia",
      },
      {
        icon: <Clock className="h-5 w-5" />,
        color: "from-amber-400 to-orange-500",
        label: "Chưa nộp",
        value: String(stats.pending),
        subtitle: "Cần hoàn thành trong thời gian tới",
      },
      {
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: "from-emerald-500 to-teal-500",
        label: "Đã nộp",
        value: String(stats.submitted),
        subtitle: "Đã gửi cho giáo viên",
      },
      {
        icon: <AlertCircle className="h-5 w-5" />,
        color: "from-rose-500 to-orange-500",
        label: "Quá hạn",
        value: String(stats.overdue),
        subtitle: "Cần xem lại và rút kinh nghiệm",
      },
    ],
    [stats]
  );

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Bài tập", href: "/dashboard/student/assignments" },
  ];

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <Breadcrumb items={breadcrumbItems} className="mb-2" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Lỗi tải danh sách bài tập</h3>
              <p className="text-sm mb-4">{error}</p>
              <Button onClick={fetchAllAssignments} size="sm" className="bg-rose-600 hover:bg-rose-700">
                Thử lại
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} className="mb-3" />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            Bài tập của tôi
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Tất cả bài tập từ các lớp học bạn đã tham gia.
          </p>
        </div>
      </div>

      <StatsGrid items={statItems} />

      {/* Filter và Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as "all" | "pending" | "submitted" | "overdue"
            )
          }
        >
          <option value="all">Tất cả bài tập</option>
          <option value="pending">Chưa nộp</option>
          <option value="submitted">Đã nộp</option>
          <option value="overdue">Quá hạn</option>
        </Select>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài tập..."
          className="flex-1"
        />
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
        <EmptyState
          icon="📝"
          title="Chưa có bài tập nào"
          description={
            assignments.length === 0
              ? "Bạn chưa có bài tập nào từ các lớp học"
              : "Không tìm thấy bài tập nào phù hợp với bộ lọc"
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}