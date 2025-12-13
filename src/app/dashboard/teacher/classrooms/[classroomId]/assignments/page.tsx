"use client";

import { useEffect, useState, useMemo } from "react";

import { useRouter, useParams } from "next/navigation";
import { useClassroomAssignments, ClassroomAssignment } from "@/hooks/use-classroom-assignments";
import { useToast } from "@/hooks/use-toast";
import AddAssignmentDialog from "@/components/teacher/classrooms/assignments/AddAssignmentDialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { StatsGrid } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import AssignmentTable from "@/components/teacher/assignments/AssignmentTable";
import AssignmentFiltersToolbar, { AssignmentStatusFilter, AssignmentTypeFilter, AssignmentSortKey } from "@/components/teacher/assignments/AssignmentFiltersToolbar";
import AssignmentCardSkeleton from "@/components/teacher/assignments/AssignmentCardSkeleton";
import { AlertTriangle, NotebookText, BarChart3, Clock, LayoutList, LayoutGrid, HelpCircle, Inbox } from "lucide-react";

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
            {assignment.type === "ESSAY" ? (
              <NotebookText className="h-4 w-4" />
            ) : (
              <HelpCircle className="h-4 w-4" />
            )}
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
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Hạn nộp:</span>{" "}
                <span className="font-medium text-gray-800">
                  {dueDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                  {dueDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Inbox className="h-4 w-4" />
              <span>Đã nộp:</span>{" "}
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
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<AssignmentTypeFilter>("all");
  const [sortKey, setSortKey] = useState<AssignmentSortKey>("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const [view, setView] = useState<"list" | "table">(() => {
    if (typeof window === "undefined") return "list";
    return (window.localStorage.getItem("teacher:classroom-assignments:view") as "list" | "table") || "list";
  });
  useEffect(() => {
    try { window.localStorage.setItem("teacher:classroom-assignments:view", view); } catch {}
  }, [view]);

  // Load assignments khi component mount
  useEffect(() => {
    if (classroomId) {
      fetchClassroomAssignments(classroomId);
    }
  }, [classroomId, fetchClassroomAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    const now = new Date();
    let list = [...assignments];

    if (statusFilter !== "all") {
      list = list.filter((a) => {
        const eff = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
        const dueDate = eff ? new Date(eff as any) : null;
        switch (statusFilter) {
          case "active":
            return !!dueDate && dueDate >= now;
          case "overdue":
            return !!dueDate && dueDate < now;
          case "upcoming":
            return !!dueDate && dueDate > now;
          default:
            return true;
        }
      });
    }

    if (typeFilter !== "all") {
      list = list.filter((a) => a.type === typeFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((a) =>
        (a.title || "").toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortKey === "due") {
        const effA = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
        const effB = b.type === "QUIZ" ? (b as any).lockAt || b.dueDate : b.dueDate;
        const da = effA ? new Date(effA as any).getTime() : 0;
        const db = effB ? new Date(effB as any).getTime() : 0;
        return da - db;
      }
      if (sortKey === "submissions") {
        const sa = a._count?.submissions ?? 0;
        const sb = b._count?.submissions ?? 0;
        return sb - sa;
      }
      const dateA = new Date(a.addedAt || a.createdAt).getTime();
      const dateB = new Date(b.addedAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    return list;
  }, [assignments, statusFilter, typeFilter, sortKey, searchQuery]);

  // Tính toán statistics
  const stats = useMemo(() => {
    const now = new Date();
    const total = assignments.length;
    const active = assignments.filter((a) => {
      const eff = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
      const dueDate = eff ? new Date(eff as any) : null;
      return dueDate && dueDate >= now;
    }).length;
    const overdue = assignments.filter((a) => {
      const eff = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
      const dueDate = eff ? new Date(eff as any) : null;
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
        const res = await fetch(`/api/classrooms/${classroomId}`, { cache: "no-store" });
        const result = await res.json();
        const count =
          result &&
          typeof result === "object" &&
          "_count" in result &&
          (result as { _count?: { students?: unknown } })._count &&
          typeof (result as { _count?: { students?: unknown } })._count?.students === "number"
            ? ((result as { _count?: { students?: number } })._count?.students as number)
            : null;
        if (count !== null) {
          setTotalStudents(count);
        }
      } catch (err) {
        console.error("[ClassroomAssignmentsPage] Lỗi khi lấy số học sinh:", err);
      }
    }
    if (classroomId) fetchTotalStudents();
  }, [classroomId]);

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10 text-red-500" />}
        title="Lỗi tải danh sách bài tập"
        description={error}
        variant="teacher"
        action={<Button onClick={() => fetchClassroomAssignments(classroomId)}>Thử lại</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Bài tập của lớp</h2>
          <p className="text-gray-600">Quản lý và theo dõi các bài tập trong lớp học này</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}> Thêm bài tập</Button>
      </div>

      <StatsGrid
        items={[
          { icon: <NotebookText className="h-5 w-5" />, color: "from-blue-200 to-indigo-200", label: "Tổng bài tập", value: String(stats.total) },
          { icon: <Clock className="h-5 w-5" />, color: "from-green-200 to-emerald-200", label: "Đang diễn ra", value: String(stats.active) },
          { icon: <AlertTriangle className="h-5 w-5" />, color: "from-amber-200 to-orange-200", label: "Đã hết hạn", value: String(stats.overdue) },
          { icon: <BarChart3 className="h-5 w-5" />, color: "from-blue-100 to-indigo-100", label: "Tổng bài nộp", value: String(stats.totalSubmissions) },
        ]}
        onItemClick={(_, idx) => {
          if (idx === 0) setStatusFilter("all");
          if (idx === 1) setStatusFilter("active");
          if (idx === 2) setStatusFilter("overdue");
        }}
      />

      <AssignmentFiltersToolbar
        status={statusFilter}
        onStatusChange={setStatusFilter}
        type={typeFilter}
        onTypeChange={setTypeFilter}
        sortKey={sortKey}
        onSortChange={setSortKey}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        onReset={() => { setStatusFilter("all"); setTypeFilter("all"); setSortKey("newest"); setSearchQuery(""); }}
      />

      <div className="mb-2 flex items-center justify-end">
        <div className="inline-flex rounded-xl border border-blue-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
            aria-pressed={view === "list"}
          >
            <LayoutList className="h-4 w-4" /> Danh sách
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm border-l border-blue-200 ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
            aria-pressed={view === "table"}
          >
            <LayoutGrid className="h-4 w-4" /> Bảng
          </button>
        </div>
      </div>

      {isLoading ? (
        view === "table" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-4">
            {[1,2,3].map((i) => (<AssignmentCardSkeleton key={i} />))}
          </div>
        )
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<NotebookText className="h-10 w-10 text-blue-500" />}
          title="Chưa có bài tập nào"
          description="Thêm bài tập để bắt đầu cho lớp học này."
          variant="teacher"
          action={<Button onClick={() => setIsDialogOpen(true)}> Thêm bài tập đầu tiên</Button>}
        />
      ) : view === "table" ? (
        <AssignmentTable
          items={filteredAssignments}
          onView={(id) => router.push(`/dashboard/teacher/assignments/${id}`)}
          onEdit={(id) => router.push(`/dashboard/teacher/assignments/${id}`)}
          onSubmissions={(id) => handleViewSubmissions(id)}
          onDelete={(id) => handleRemoveAssignment(id)}
        />
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