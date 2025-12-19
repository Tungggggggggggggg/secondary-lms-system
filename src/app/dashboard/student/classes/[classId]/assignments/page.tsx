"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { Button } from "@/components/ui/button";
import { AlertCircle, FileText } from "lucide-react";
import StudentAssignmentCard from "@/components/student/StudentAssignmentCard";
import { EmptyState } from "@/components/shared";
import { SectionHeader } from "@/components/shared";
import AssignmentFilters from "@/components/student/AssignmentFilters";

/**
 * Trang bài tập của lớp học (student view)
 */
export default function StudentClassroomAssignmentsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // UI filter state (đồng bộ với ?filter= trên URL nếu có)
  type Status = "all" | "pending" | "submitted" | "overdue";
  type Sort = "due_asc" | "recent" | "grade_desc";
  const [filters, setFilters] = useState<{ status: Status; query: string; sort: Sort }>({
    status: "all",
    query: "",
    sort: "recent",
  });

  useEffect(() => {
    const f = searchParams.get("filter");
    if (!f) return;
    if (f === "submitted" || f === "overdue" || f === "pending") {
      setFilters((v) => ({ ...v, status: f as Status }));
    }
    if (f === "dueSoon") {
      setFilters((v) => ({ ...v, status: "pending", sort: "due_asc" }));
    }
  }, [searchParams]);

  const onlyDueSoon = searchParams.get("filter") === "dueSoon";

  // Filter và sort assignments
  const filteredAssignments = useMemo(() => {
    let arr = [...assignments];
    const now = new Date();

    // Status filter
    if (filters.status !== "all") {
      arr = arr.filter((a) => a.status === filters.status);
    }
    // dueSoon filter nếu có
    if (onlyDueSoon) {
      arr = arr.filter((a) => {
        if (!a.dueDate || a.submission) return false;
        const d = new Date(a.dueDate);
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return d > now && d <= in7;
      });
    }
    // Query filter
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      arr = arr.filter((a) => a.title.toLowerCase().includes(q));
    }

    // Sort
    if (filters.sort === "due_asc") {
      arr.sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    } else if (filters.sort === "grade_desc") {
      arr.sort((a, b) => {
        const ga = a.submission?.grade ?? -Infinity;
        const gb = b.submission?.grade ?? -Infinity;
        return gb - ga;
      });
    } else {
      // recent by updatedAt/createdAt
      arr.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
    }

    return arr;
  }, [assignments, filters, onlyDueSoon]);

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
              variant="outline"
              color="green"
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
      <SectionHeader title={<span className="text-green-700">Bài tập của lớp</span>} />
      <AssignmentFilters value={filters} onChange={setFilters} />

      {/* Assignment List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/90 rounded-2xl border border-border p-4 sm:p-5 animate-pulse"
            >
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded-full w-20" />
                <div className="h-6 bg-muted rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-green-600" />}
          title="Chưa có bài tập nào"
          description="Giáo viên chưa thêm bài tập nào vào lớp học này. Hãy quay lại sau để kiểm tra."
        />
      ) : (
        <div className="space-y-4" role="list">
          {filteredAssignments.map((assignment) => (
            <StudentAssignmentCard
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