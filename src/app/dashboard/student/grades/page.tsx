// src/app/student/grades/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, CheckCircle2, Clock, ChevronDown, MessageCircle } from "lucide-react";

/**
 * Trang điểm số của tôi (student view - tất cả classrooms)
 */
export default function GradesPage() {
  const { grades, statistics, isLoading, error, fetchAllGrades } = useStudentGrades();
  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom"
  >("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  // Load grades khi component mount
  useEffect(() => {
    fetchAllGrades();
  }, [fetchAllGrades]);

  // Filter và sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = [...grades];

    // Filter theo search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.assignmentTitle.toLowerCase().includes(query) ||
          g.classroom?.name.toLowerCase().includes(query) ||
          g.feedback?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "grade_desc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA; // Điểm cao nhất trước
        });
        break;
      case "grade_asc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeA - gradeB; // Điểm thấp nhất trước
        });
        break;
      case "due_date":
        filtered.sort((a, b) => {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return timeA - timeB; // Gần hạn nộp trước
        });
        break;
      case "classroom":
        filtered.sort((a, b) => {
          const nameA = a.classroom?.name || "";

          const nameB = b.classroom?.name || "";
          return nameA.localeCompare(nameB);
        });
        break;
      case "newest":
        filtered.sort((a, b) => {
          const timeA = a.submittedAt
            ? new Date(a.submittedAt).getTime()
            : 0;
          const timeB = b.submittedAt
            ? new Date(b.submittedAt).getTime()
            : 0;
          return timeB - timeA;
        });
        break;
    }

    return filtered;
  }, [grades, sortBy, searchQuery]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getGradeBadgeClass = (grade: number | null) => {
    if (grade === null) {
      return "bg-amber-50 text-amber-700 border border-amber-100";
    }
    if (grade >= 5) {
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }
    return "bg-rose-50 text-rose-700 border border-rose-100";
  };

  const getStatusBadge = (status: GradeEntry["status"]) => {
    switch (status) {
      case "graded":
        return {
          label: "Đã chấm",
          className:
            "bg-emerald-50 text-emerald-700 border border-emerald-100",
        };
      case "submitted":
        return {
          label: "Chờ chấm",
          className: "bg-amber-50 text-amber-700 border border-amber-100",
        };
      default:
        return {
          label: "Chưa nộp",
          className: "bg-slate-50 text-slate-700 border border-slate-200",
        };
    }
  };

  const handleOpenFeedback = (grade: GradeEntry) => {
    if (!grade.feedback) return;
    setSelectedFeedback({
      assignmentTitle: grade.assignmentTitle,
      feedback: grade.feedback,
    });
    setFeedbackOpen(true);
  };

  // Export CSV helper
  function toCsvValue(v: unknown): string {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsv() {
    const rows: string[] = [];
    rows.push([
      "Classroom",
      "Assignment",
      "Type",
      "Grade",
      "Feedback",
      "SubmittedAt",
    ].map(toCsvValue).join(","));

    for (const g of filteredAndSortedGrades) {
      rows.push([
        g.classroom?.name || "",
        g.assignmentTitle,
        g.assignmentType,
        g.grade !== null && g.grade !== undefined ? g.grade.toFixed(1) : "",
        g.feedback || "",
        g.submittedAt ? new Date(g.submittedAt).toISOString() : "",
      ].map(toCsvValue).join(","));
    }

    const csv = "\ufeff" + rows.join("\n"); // BOM UTF-8
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grades.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Điểm số", href: "/dashboard/student/grades" },
  ];

  if (error) {
    return (
      <div className="p-6">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={fetchAllGrades}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={breadcrumbItems} className="mb-2" />

      {/* Header + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-1">
            Điểm số của tôi
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Tổng hợp điểm số từ tất cả lớp học bạn tham gia.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <Button onClick={downloadCsv} className="rounded-full px-5">
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* KPI Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(16,185,129,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-md">
            <Award className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-emerald-700/80 uppercase">
              Điểm trung bình
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.averageGrade > 0
                ? statistics.averageGrade.toFixed(1)
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(56,189,248,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-sky-700/80 uppercase">
              Đã chấm
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.totalGraded ?? 0}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(251,191,36,0.18)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-md">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-amber-700/80 uppercase">
              Chưa chấm
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {statistics.totalPending ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Filter và Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Sắp xếp theo
          </span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "newest"
                    | "grade_desc"
                    | "grade_asc"
                    | "due_date"
                    | "classroom"
                )
              }
              className="appearance-none px-4 pr-9 py-2 bg-white/90 rounded-full border border-slate-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="newest">Mới nhất</option>
              <option value="grade_desc">Điểm cao nhất</option>
              <option value="grade_asc">Điểm thấp nhất</option>
              <option value="due_date">Hạn nộp</option>
              <option value="classroom">Theo lớp học</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài tập hoặc lớp học..."
          className="flex-1 px-4 py-2 bg-white/90 rounded-full border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
        />
      </div>

      {/* Grades Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 animate-pulse">
          Đang tải danh sách điểm số...
        </div>
      ) : filteredAndSortedGrades.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-10 text-center border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-slate-600">
            {grades.length === 0
              ? "Bạn chưa có bài nộp nào được chấm điểm"
              : "Không tìm thấy điểm số nào phù hợp với bộ lọc"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50/60">
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Lớp học</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Bài tập</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Loại</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Điểm</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Nhận xét</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Ngày nộp</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedGrades.map((grade) => {
                  const statusBadge = getStatusBadge(grade.status);
                  return (
                    <TableRow
                      key={grade.id}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <TableCell>
                        {grade.classroom ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{grade.classroom.icon}</span>
                            <span className="font-medium text-slate-900">
                              {grade.classroom.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {grade.assignmentTitle}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            grade.assignmentType === "ESSAY"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-pink-50 text-pink-700 border border-pink-100"
                          }`}
                        >
                          {grade.assignmentType === "ESSAY"
                            ? "📝 Tự luận"
                            : "❓ Trắc nghiệm"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {grade.grade !== null ? (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                              grade.grade,
                            )}`}
                          >
                            {grade.grade.toFixed(1)}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                              null,
                            )}`}
                          >
                            Chưa chấm
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {grade.feedback ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(grade)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors shadow-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {grade.submittedAt ? formatDate(grade.submittedAt) : "Chưa nộp"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {selectedFeedback && (
            <Dialog
              open={feedbackOpen}
              onOpenChange={(open) => {
                setFeedbackOpen(open);
                if (!open) {
                  setSelectedFeedback(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nhận xét của giáo viên</DialogTitle>
                  <DialogDescription>
                    Bài tập: <span className="font-medium">{selectedFeedback.assignmentTitle}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 text-sm text-slate-800 whitespace-pre-line max-h-[50vh] overflow-y-auto">
                  {selectedFeedback.feedback}
                </div>
                <DialogFooter>
                  <Button onClick={() => setFeedbackOpen(false)}>Đóng</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}