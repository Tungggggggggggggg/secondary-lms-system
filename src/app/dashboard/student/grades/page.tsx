// src/app/student/grades/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, CheckCircle2, Clock, MessageCircle, Search, BookOpen, FileText, ListChecks, BarChart3 } from "lucide-react";

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
      <div className="max-w-6xl mx-auto space-y-4">
        <Breadcrumb items={breadcrumbItems} color="green" className="mb-2" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={fetchAllGrades} color="green">Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Breadcrumb items={breadcrumbItems} color="green" className="mb-2" />

      <PageHeader
        role="student"
        title="Điểm số của tôi"
        subtitle="Tổng hợp điểm số từ tất cả lớp học bạn tham gia."
      />

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
              {(statistics.totalGraded ?? 0) > 0
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

      {/* Toolbar: Search (left) + Sort & Export (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Search */}
        <div className="relative md:justify-self-start">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Tìm kiếm bài tập hoặc lớp học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color="green"
            className="pl-10 h-12 w-full md:w-96"
            aria-label="Tìm kiếm điểm số"
          />
        </div>

        {/* Controls: Sort + Export */}
        <div className="flex items-center justify-start md:justify-end gap-2">
          <Select
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
            color="green"
            className="sm:w-56 h-12"
            aria-label="Sắp xếp điểm số"
          >
            <option value="newest">Mới nhất</option>
            <option value="grade_desc">Điểm cao nhất</option>
            <option value="grade_asc">Điểm thấp nhất</option>
            <option value="due_date">Hạn nộp</option>
            <option value="classroom">Theo lớp học</option>
          </Select>

          <Button onClick={downloadCsv} color="green" className="rounded-xl h-12 px-5">
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Grades Table */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-10 w-60 bg-slate-200 rounded-xl motion-safe:animate-pulse" />
          <div className="h-8 w-full bg-slate-200 rounded-xl motion-safe:animate-pulse" />
          <div className="h-64 w-full bg-slate-200 rounded-2xl motion-safe:animate-pulse" />
        </div>
      ) : filteredAndSortedGrades.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-10 text-center border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex justify-center">
            <BarChart3 className="h-12 w-12 text-green-600" />
          </div>

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
                <TableRow className="bg-green-50/60">
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
                      className="hover:bg-green-50/40 transition-colors"
                    >
                      <TableCell>
                        {grade.classroom ? (
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-green-600" />
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
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          {grade.assignmentType === "ESSAY" ? (
                            <>
                              <FileText className="h-3.5 w-3.5" />
                              <span>Tự luận</span>
                            </>
                          ) : (
                            <>
                              <ListChecks className="h-3.5 w-3.5" />
                              <span>Trắc nghiệm</span>
                            </>
                          )}
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
                            className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 hover:border-green-200 transition-colors shadow-sm"
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
              <DialogContent onClose={() => setFeedbackOpen(false)}>
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