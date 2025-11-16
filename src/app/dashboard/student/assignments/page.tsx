// src/app/student/assignments/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useStudentAssignments, StudentAssignment } from "@/hooks/use-student-assignments";

/**
 * Component hiển thị assignment card
 */
function AssignmentCard({ assignment }: { assignment: StudentAssignment }) {
  const router = useRouter();
  const now = new Date();
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
  const openAt = (assignment as any).openAt ? new Date((assignment as any).openAt) : null;
  const lockAt = (assignment as any).lockAt ? new Date((assignment as any).lockAt) : (dueDate || null);
  const isOverdue = dueDate && dueDate < now && !assignment.submission;
  const isUrgent = dueDate && dueDate > now && (dueDate.getTime() - now.getTime()) < 24 * 60 * 60 * 1000; // Còn < 24h
  const beforeStart = openAt && now < openAt;
  const afterEnd = lockAt && now > lockAt;

  return (
    <div
      className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/student/assignments/${assignment.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isUrgent && !assignment.submission && (
              <Badge className="bg-red-600 text-white">SẮP HẾT HẠN</Badge>
            )}
            {assignment.submission && assignment.submission.grade !== null && (
              <Badge className="bg-green-600 text-white">ĐÃ CHẤM</Badge>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {assignment.title}
          </h3>
          {assignment.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {assignment.description}
            </p>
          )}
          {assignment.classroom && (
            <p className="text-sm text-gray-600">
              📚 Lớp: {assignment.classroom.name} • GV: {assignment.classroom.teacher?.fullname || "N/A"}
            </p>
          )}
        </div>
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
      </div>

      <div className="mt-4 space-y-2">
        {(openAt || lockAt) && (
          <p className="text-sm text-gray-600">
            ⏱️ Lịch:&nbsp;
            <span className="font-medium text-gray-800">
              {openAt ? openAt.toLocaleString("vi-VN") : "Hiện tại"} → {lockAt ? lockAt.toLocaleString("vi-VN") : "Không giới hạn"}
            </span>
          </p>
        )}

        {assignment.submission && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
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
        )}

        {isOverdue && !assignment.submission && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-red-800">
              ⚠️ Đã quá hạn nộp bài
            </p>
            <p className="text-sm text-red-700 mt-1">
              Điểm: <span className="font-bold">0</span>
            </p>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-gray-100">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/student/assignments/${assignment.id}`);
            }}
            variant={assignment.submission ? "outline" : "default"}
            disabled={!!beforeStart || !!afterEnd}
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
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      
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

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Bài tập", href: "/dashboard/student/assignments" },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách bài tập</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={fetchAllAssignments}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Bài tập của tôi</h1>
          <p className="text-gray-600">
            Tất cả bài tập từ các lớp học bạn đã tham gia
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Tổng số bài tập</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Chưa nộp</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Đã nộp</div>
          <div className="text-2xl font-bold text-green-600">{stats.submitted}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="text-sm text-gray-600 mb-1">Quá hạn</div>
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
        </div>
      </div>

      {/* Filter và Search */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as "all" | "pending" | "submitted" | "overdue"
            )
          }
          className="px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">Tất cả bài tập</option>
          <option value="pending">Chưa nộp</option>
          <option value="submitted">Đã nộp</option>
          <option value="overdue">Quá hạn</option>
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài tập..."
          className="flex-1 px-4 py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
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
            {assignments.length === 0
              ? "Bạn chưa có bài tập nào từ các lớp học"
              : "Không tìm thấy bài tập nào phù hợp với bộ lọc"}
          </p>
        </div>
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