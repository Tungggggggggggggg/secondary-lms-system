"use client";

import { useEffect, useState, useMemo } from "react";

import { useRouter, useParams } from "next/navigation";
import { useClassroomAssignments, ClassroomAssignment } from "@/hooks/use-classroom-assignments";
import { useToast } from "@/hooks/use-toast";
import AddAssignmentDialog from "@/components/teacher/classroom/AddAssignmentDialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ConfirmProvider";

/**
 * Component hiển thị assignment card
 */
function AssignmentCard({
  assignment,
  onRemove,
  onViewSubmissions,
  totalStudents,
}: {
  assignment: ClassroomAssignment;
  onRemove: () => void;
  onViewSubmissions: () => void;
  totalStudents: number;
}) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const confirm = useConfirm();

  // Tính toán trạng thái và màu sắc
  const now = new Date();
  const effectiveDueRaw = assignment.type === "QUIZ" ? (assignment as any).lockAt || assignment.dueDate : assignment.dueDate;
  const dueDate = effectiveDueRaw ? new Date(effectiveDueRaw) : null;
  const isOverdue = dueDate && dueDate < now;
  const isUpcoming = dueDate && dueDate > now;

  const statusColor = isOverdue
    ? "bg-red-100 text-red-600"
    : isUpcoming
    ? "bg-green-100 text-green-600"
    : "bg-gray-100 text-gray-600";

  const statusText = isOverdue ? "Đã hết hạn" : isUpcoming ? "Đang diễn ra" : "Chưa có hạn";

  const submissionCount = assignment._count?.submissions ?? 0;
  const submissionPercentage =
    totalStudents > 0 ? Math.round((submissionCount / totalStudents) * 100) : 0;

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Xóa bài tập khỏi lớp",
      description: "Bạn có chắc muốn xóa bài tập này khỏi lớp không?",
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!ok) return;
    setIsRemoving(true);
    await onRemove();
    setIsRemoving(false);
  };

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
      onClick={() =>
        router.push(`/dashboard/teacher/assignments/${assignment.id}`)
      }
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            {dueDate && (
              <span>
                📅 Hạn nộp:{" "}
                <span className="font-medium text-gray-800">
                  {dueDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  {" "}
                  {dueDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            )}
            <span>
              📥 Đã nộp:{" "}
              <span className="font-medium text-gray-800">
                {submissionCount} / {totalStudents}
              </span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all"
              style={{
                width: `${submissionPercentage}%`,
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {submissionPercentage}% học sinh đã nộp
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSubmissions();
            }}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-sm font-medium"
          >
            Xem bài nộp
          </button>
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            {isRemoving ? "Đang xóa..." : "Xóa khỏi lớp"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Trang quản lý bài tập của lớp học
 */
export default function ClassroomAssignmentsPage() {
  const router = useRouter();
  const params = useParams();
  const classroomId = params.classroomId as string;

  const {
    assignments,
    isLoading,
    error,
    fetchClassroomAssignments,
    removeAssignmentFromClassroom,
  } = useClassroomAssignments();

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "overdue" | "upcoming"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load assignments khi component mount
  useEffect(() => {
    if (classroomId) {
      fetchClassroomAssignments(classroomId);
    }
  }, [classroomId, fetchClassroomAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    const now = new Date();
    let filtered = [...assignments];

    // Filter theo status
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const dueDate = a.dueDate ? new Date(a.dueDate) : null;
        switch (statusFilter) {
          case "active":
            return dueDate && dueDate >= now;
          case "overdue":
            return dueDate && dueDate < now;
          case "upcoming":
            return dueDate && dueDate > now;
          default:
            return true;
        }
      });
    }

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query)
      );
    }

    // Sort: mới thêm nhất trước
    filtered.sort((a, b) => {
      const dateA = new Date(a.addedAt || a.createdAt).getTime();
      const dateB = new Date(b.addedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return filtered;
  }, [assignments, statusFilter, searchQuery]);

  // Tính toán statistics
  const stats = useMemo(() => {
    const now = new Date();
    const total = assignments.length;
    const active = assignments.filter((a) => {
      const dueDate = a.dueDate ? new Date(a.dueDate) : null;
      return dueDate && dueDate >= now;
    }).length;
    const overdue = assignments.filter((a) => {
      const dueDate = a.dueDate ? new Date(a.dueDate) : null;
      return dueDate && dueDate < now;
    }).length;
    const totalSubmissions = assignments.reduce(
      (sum, a) => sum + (a._count?.submissions ?? 0),
      0
    );

    return { total, active, overdue, totalSubmissions };
  }, [assignments]);

  // Xử lý xóa assignment khỏi classroom
  const handleRemoveAssignment = async (assignmentId: string) => {
    const success = await removeAssignmentFromClassroom(classroomId, assignmentId);
    if (success) {
      toast({
        title: "Đã xóa bài tập khỏi lớp",
        variant: "success",
      });
    } else {
      toast({
        title: "Xóa bài tập thất bại",
        description: "Không thể xóa bài tập khỏi lớp",
        variant: "destructive",
      });
    }
  };

  // Xử lý xem submissions
  const handleViewSubmissions = (assignmentId: string) => {
    router.push(`/dashboard/teacher/assignments/${assignmentId}/submissions`);
  };

  // Fetch số học sinh từ classroom
  const [totalStudents, setTotalStudents] = useState(0);
  useEffect(() => {
    async function fetchTotalStudents() {
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/students`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setTotalStudents(result.data.length);
        }
      } catch (err) {
        console.error("[ClassroomAssignmentsPage] Lỗi khi lấy số học sinh:", err);
      }
    }
    if (classroomId) fetchTotalStudents();
  }, [classroomId]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-semibold mb-2">Lỗi tải danh sách bài tập</h3>
        <p className="text-sm mb-4">{error}</p>
        <Button onClick={() => fetchClassroomAssignments(classroomId)}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header với Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bài tập của lớp</h2>
          <p className="text-gray-600">
            Quản lý và theo dõi các bài tập trong lớp học này
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          ➕ Thêm bài tập
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Tổng số bài tập</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Đang diễn ra</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Đã hết hạn</div>
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Tổng bài nộp</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalSubmissions}
          </div>
        </div>
      </div>

      {/* Filter và Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "active" | "overdue" | "upcoming"
              )
            }
            className="px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả bài tập</option>
            <option value="active">Đang diễn ra</option>
            <option value="overdue">Đã hết hạn</option>
            <option value="upcoming">Sắp tới</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bài tập..."
            className="flex-1 px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
          <p className="text-gray-600 mb-6">
            Thêm bài tập đầu tiên để bắt đầu với lớp học này
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            ➕ Thêm bài tập đầu tiên
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onRemove={() => handleRemoveAssignment(assignment.id)}
              onViewSubmissions={() => handleViewSubmissions(assignment.id)}
              totalStudents={totalStudents}
            />
          ))}
        </div>
      )}

      {/* Add Assignment Dialog */}
      <AddAssignmentDialog
        classroomId={classroomId}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          fetchClassroomAssignments(classroomId);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}