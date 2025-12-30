// src/app/student/grades/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { useStudentGrades, GradeEntry } from "@/hooks/use-student-grades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { grades, statistics, pagination, isLoading, error, fetchAllGradesPaged } = useStudentGrades();
  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom"
  >("classroom");
  const [viewMode, setViewMode] = useState<"card" | "table" | "matrix">("card");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load grades (server-side search/sort/pagination)
  useEffect(() => {
    setPage(1);
    fetchAllGradesPaged({
      page: 1,
      pageSize,
      q: debouncedQuery || undefined,
      sort: sortBy,
      append: false,
    });
  }, [fetchAllGradesPaged, debouncedQuery, sortBy]);

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
          className: "bg-muted/40 text-muted-foreground border border-border",
        };
    }
  };

  const resolveMatrixStatus = (grade: GradeEntry): "graded" | "submitted" | "missing" | "overdue" => {
    if (grade.status === "graded") return "graded";
    if (grade.status === "submitted") return "submitted";
    const due = grade.dueDate ? new Date(grade.dueDate) : null;
    if (due && due.getTime() < Date.now()) return "overdue";
    return "missing";
  };

  const getMatrixCellStyle = (status: "graded" | "submitted" | "missing" | "overdue", grade: number | null) => {
    if (status === "graded") {
      if (grade === null) return "bg-emerald-50 text-emerald-800 border-emerald-200";
      if (grade >= 5) return "bg-emerald-50 text-emerald-800 border-emerald-200";
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (status === "submitted") return "bg-amber-50 text-amber-800 border-amber-200";
    if (status === "overdue") return "bg-rose-50/70 text-rose-800 border-rose-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const getMatrixCellLabel = (status: "graded" | "submitted" | "missing" | "overdue", grade: number | null) => {
    if (status === "graded") return grade !== null ? grade.toFixed(1) : "—";
    if (status === "submitted") return "Chờ";
    if (status === "overdue") return "0";
    return "—";
  };

  const renderGradeBadge = (grade: number | null) => {
    const baseClass =
      "inline-flex items-center justify-center min-w-[3.25rem] px-3 py-1.5 rounded-full text-sm sm:text-base font-semibold shadow-sm ";

    const variantClass = getGradeBadgeClass(grade);

    if (grade === null) {
      return (
        <span className={baseClass + variantClass}>
          Chưa chấm
        </span>
      );
    }

    return (
      <span className={baseClass + variantClass}>
        {grade.toFixed(1)}
      </span>
    );
  };

  const renderStatusBadge = (status: GradeEntry["status"]) => {
    const { label, className } = getStatusBadge(status);
    return (
      <span
        className={
          "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium shadow-sm " +
          className
        }
      >
        {label}
      </span>
    );
  };

  const handleOpenFeedback = (grade: GradeEntry) => {
    if (!grade.feedback) return;
    setSelectedFeedback({
      assignmentTitle: grade.assignmentTitle,
      feedback: grade.feedback,
    });
    setFeedbackOpen(true);
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/student/dashboard" },
    { label: "Điểm số", href: "/dashboard/student/grades" },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbItems} color="green" className="mb-2" />
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button
            onClick={() =>
              fetchAllGradesPaged({
                page: 1,
                pageSize,
                q: debouncedQuery || undefined,
                sort: sortBy,
                append: false,
              })
            }
            color="green"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  const groupedByClassroom = useMemo(() => {
    if (!grades.length) return [] as Array<{ id: string; name: string; icon: string | null; grades: GradeEntry[] }>;

    const map = new Map<string, { id: string; name: string; icon: string | null; grades: GradeEntry[] }>();

    for (const g of grades) {
      const id = g.classroom?.id || "__no_class__";
      const name = g.classroom?.name || "Lớp khác";
      const icon = g.classroom?.icon ?? null;
      const existing = map.get(id);
      if (existing) {
        existing.grades.push(g);
      } else {
        map.set(id, { id, name, icon, grades: [g] });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [grades]);

  const renderGradeCard = (grade: GradeEntry, options?: { hideClassroom?: boolean }) => {
    const hideClassroom = options?.hideClassroom ?? false;

    return (
      <div
        key={grade.id}
        className="bg-card/90 rounded-3xl border border-border shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4 sm:p-5 hover:bg-green-50/30 transition-colors"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {!hideClassroom && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <div className="text-sm font-semibold text-foreground truncate">
                  {grade.classroom?.name || "Lớp khác"}
                </div>
              </div>
            )}
            <div className={"text-base font-semibold text-foreground truncate" + (hideClassroom ? "" : " mt-1")}>
              {grade.assignmentTitle}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
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

              {renderStatusBadge(grade.status)}
            </div>
            <div className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {grade.submittedAt
                ? `Đã nộp: ${formatDate(grade.submittedAt)}`
                : "Chưa nộp bài"}
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 sm:items-center sm:justify-end sm:gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Điểm
              </span>
              {renderGradeBadge(grade.grade)}
            </div>

            <div className="shrink-0">
              {grade.feedback ? (
                <button
                  type="button"
                  onClick={() => handleOpenFeedback(grade)}
                  className="inline-flex items-center gap-1 rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 hover:border-green-200 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Xem</span>
                </button>
              ) : (
                <span className="text-xs text-muted-foreground italic">Không có nhận xét</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleChangeViewMode = (mode: "card" | "table" | "matrix") => {
    setViewMode(mode);
    if (mode !== "card") {
      setSortBy("classroom");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} color="green" className="mb-2" />

      <PageHeader
        role="student"
        title="Điểm số của tôi"
        subtitle="Tổng hợp điểm số từ tất cả lớp học bạn tham gia."
      />

      {/* KPI Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-background to-emerald-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(16,185,129,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-md">
            <Award className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-emerald-700/80 uppercase">
              Điểm trung bình
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {(statistics.totalGraded ?? 0) > 0
                ? statistics.averageGrade.toFixed(1)
                : "N/A"}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-background to-sky-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(56,189,248,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-sky-700/80 uppercase">
              Đã chấm
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {statistics.totalGraded ?? 0}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-background to-amber-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(251,191,36,0.18)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-md">
            <Clock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-amber-700/80 uppercase">
              Chưa chấm
            </div>
            <div className="text-2xl font-semibold text-foreground">
              {statistics.totalPending ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search (left) + View mode (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">

        {/* Search */}
        <div className="relative md:justify-self-start">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Tìm kiếm điểm hoặc lớp học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color="green"
            className="pl-10 h-12 w-full md:w-96"
            aria-label="Tìm kiếm điểm số"
          />
        </div>

        {/* Controls: View mode */}
        <div className="flex items-center justify-start md:justify-end gap-2">
          <Tabs
            value={viewMode === "card" ? "students" : viewMode === "table" ? "assignments" : "matrix"}
            onValueChange={(v) => {
              if (v === "students") handleChangeViewMode("card");
              if (v === "assignments") handleChangeViewMode("table");
              if (v === "matrix") handleChangeViewMode("matrix");
            }}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="students">Theo học sinh</TabsTrigger>
              <TabsTrigger value="assignments">Theo bài tập</TabsTrigger>
              <TabsTrigger value="matrix">Ma trận</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Grades List */}
      {isLoading && grades.length === 0 ? (
        <div className="space-y-3">
          <div className="h-10 w-60 bg-muted rounded-xl motion-safe:animate-pulse" />
          <div className="h-8 w-full bg-muted rounded-xl motion-safe:animate-pulse" />
          <div className="h-64 w-full bg-muted rounded-2xl motion-safe:animate-pulse" />
        </div>
      ) : grades.length === 0 ? (
        <div className="bg-card/90 rounded-3xl p-10 text-center border border-border shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex justify-center">
            <BarChart3 className="h-12 w-12 text-green-600" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            Chưa có điểm số nào
          </h3>
          <p className="text-muted-foreground">
            {debouncedQuery
              ? "Không tìm thấy điểm số nào phù hợp với từ khóa tìm kiếm"
              : "Bạn chưa có điểm nào được ghi nhận"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortBy === "classroom" ? (
            <div className="space-y-4">
              {groupedByClassroom.map((group) => {
                const gradedInClass = group.grades.filter((g) => g.grade !== null);
                const avgGrade =
                  gradedInClass.length > 0
                    ? gradedInClass.reduce((sum, g) => sum + (g.grade || 0), 0) /
                      gradedInClass.length
                    : null;

                return (
                  <section
                    key={group.id}
                    className="bg-card/90 rounded-3xl border border-border shadow-[0_10px_30px_rgba(15,23,42,0.04)] p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-lg font-semibold text-green-700">
                          {group.icon || group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {group.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {group.grades.length} cột điểm
                          </div>
                        </div>
                      </div>
                      {avgGrade !== null && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Trung bình: {avgGrade.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    {viewMode === "table" ? (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-xs text-muted-foreground">
                              <th className="px-3 py-2 text-left font-medium">
                                Hoạt động
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Loại
                              </th>
                              <th className="px-3 py-2 text-right font-medium">
                                Điểm
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Trạng thái
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Ngày nộp
                              </th>
                              <th className="px-3 py-2 text-left font-medium">
                                Nhận xét
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.grades.map((grade) => (
                              <tr
                                key={grade.id}
                                className="border-b border-border/40 last:border-0 hover:bg-muted/40"
                              >
                                <td className="px-3 py-2 align-top text-sm font-medium text-foreground max-w-xs">
                                  <div className="truncate" title={grade.assignmentTitle}>
                                    {grade.assignmentTitle}
                                  </div>
                                </td>
                                <td className="px-3 py-2 align-top whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                      grade.assignmentType === "ESSAY"
                                        ? "bg-green-50 text-green-700 border border-green-100"
                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                    }`}
                                  >
                                    {grade.assignmentType === "ESSAY"
                                      ? "Tự luận"
                                      : "Trắc nghiệm"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                                  {renderGradeBadge(grade.grade)}
                                </td>
                                <td className="px-3 py-2 align-top whitespace-nowrap">
                                  {renderStatusBadge(grade.status)}
                                </td>
                                <td className="px-3 py-2 align-top text-sm text-muted-foreground whitespace-nowrap">
                                  {grade.submittedAt
                                    ? formatDate(grade.submittedAt)
                                    : "Chưa nộp"}
                                </td>
                                <td className="px-3 py-2 align-top text-sm text-muted-foreground">
                                  {grade.feedback ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFeedback(grade)}
                                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
                                    >
                                      Xem
                                    </button>
                                  ) : (
                                    <span className="text-xs italic">
                                      Không có nhận xét
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : viewMode === "matrix" ? (
                      <div className="mt-3 overflow-x-auto">
                        <div className="inline-flex gap-2 pb-1">
                          {group.grades.map((grade) => {
                            const status = resolveMatrixStatus(grade);
                            const cls = getMatrixCellStyle(status, grade.grade);
                            const label = getMatrixCellLabel(status, grade.grade);
                            const statusText =
                              status === "graded"
                                ? "Đã chấm"
                                : status === "submitted"
                                ? "Chờ chấm"
                                : status === "overdue"
                                ? "Quá hạn"
                                : "Chưa nộp";

                            return (
                              <button
                                key={grade.id}
                                type="button"
                                onClick={() =>
                                  grade.feedback && handleOpenFeedback(grade)
                                }
                                className={
                                  "min-w-[120px] max-w-[160px] rounded-2xl border px-3 py-2 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 " +
                                  cls
                                }
                              >
                                <div className="text-xs font-medium truncate" title={grade.assignmentTitle}>
                                  {grade.assignmentTitle}
                                </div>
                                <div className="mt-1 text-lg font-semibold tabular-nums">
                                  {label}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium opacity-80">
                                  {statusText}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {group.grades.map((grade) =>
                          renderGradeCard(grade, { hideClassroom: true })
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {grades.map((grade) => renderGradeCard(grade))}
            </div>
          )}

          {pagination?.hasMore ? (
            <div className="pt-2 flex justify-center">
              <Button
                color="green"
                disabled={isLoading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  fetchAllGradesPaged({
                    page: nextPage,
                    pageSize,
                    q: debouncedQuery || undefined,
                    sort: sortBy,
                    append: true,
                  });
                }}
              >
                {isLoading ? "Đang tải..." : "Tải thêm"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

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
            <div className="px-6 py-4 text-sm text-foreground whitespace-pre-line max-h-[50vh] overflow-y-auto">
              {selectedFeedback.feedback}
            </div>
            <DialogFooter>
              <Button onClick={() => setFeedbackOpen(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}