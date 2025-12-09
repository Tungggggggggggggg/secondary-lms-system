// src/app/student/assignments/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/shared";
import { StatsGrid, type StatItem } from "@/components/shared";
import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import StudentAssignmentCard from "@/components/student/StudentAssignmentCard";
import AssignmentFilters from "@/components/student/AssignmentFilters";

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

  const [filters, setFilters] = useState<{ status: "all"|"pending"|"submitted"|"overdue"; query: string; sort: "due_asc"|"recent"|"grade_desc" }>({ status: "all", query: "", sort: "due_asc" });

  // Load assignments khi component mount
  useEffect(() => {
    fetchAllAssignments();
  }, [fetchAllAssignments]);

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    let filtered = [...assignments];

    // Filter theo status
    if (filters.status !== "all") {
      filtered = filtered.filter((a) => a.status === filters.status);
    }

    // Filter theo search query
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title?.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.classroom?.name.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const dueARaw = a.type === "QUIZ" ? (a as any).lockAt || a.dueDate : a.dueDate;
      const dueBRaw = b.type === "QUIZ" ? (b as any).lockAt || b.dueDate : b.dueDate;
      const dueA = dueARaw ? new Date(dueARaw).getTime() : 0;
      const dueB = dueBRaw ? new Date(dueBRaw).getTime() : 0;

      if (filters.sort === "due_asc") {
        if (dueA > 0 && dueB > 0) return dueA - dueB;
        if (dueA === 0) return 1;
        if (dueB === 0) return -1;
      }
      if (filters.sort === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sort === "grade_desc") {
        const ga = a.submission?.grade ?? -Infinity;
        const gb = b.submission?.grade ?? -Infinity;
        return gb - ga;
      }
      return 0;
    });

    return filtered;
  }, [assignments, filters]);

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
        color: "from-green-500 to-emerald-600",
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
        <Breadcrumb items={breadcrumbItems} color="green" className="mb-2" />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6 text-rose-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Lỗi tải danh sách bài tập</h3>
              <p className="text-sm mb-4">{error}</p>
              <button onClick={fetchAllAssignments} className="text-sm text-green-600 hover:text-green-700 transition-colors duration-200">
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} color="green" className="mb-3" />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Bài tập của tôi</h1>
          <p className="text-sm sm:text-base text-slate-600">Tất cả bài tập từ các lớp học bạn đã tham gia.</p>
        </div>
      </div>

      <StatsGrid
        items={statItems}
        onItemClick={(_, index) => {
          const map: Record<number, "all" | "pending" | "submitted" | "overdue"> = {
            0: "all",
            1: "pending",
            2: "submitted",
            3: "overdue",
          };
          setFilters((f) => ({ ...f, status: map[index] ?? f.status }));
        }}
      />

      {/* Filters */}
      <AssignmentFilters value={filters} onChange={setFilters} />

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
          icon={<FileText className="h-12 w-12 text-green-600" />}
          title="Chưa có bài tập nào"
          description={
            assignments.length === 0
              ? "Bạn chưa có bài tập nào từ các lớp học"
              : "Không tìm thấy bài tập nào phù hợp với bộ lọc"
          }
        />
      ) : (
        <div className="space-y-4" role="list">
          {filteredAssignments.map((assignment) => (
            <StudentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onOpen={() => router.push(`/dashboard/student/assignments/${assignment.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}