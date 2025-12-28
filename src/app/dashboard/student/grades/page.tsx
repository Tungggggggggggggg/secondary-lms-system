// src/app/student/grades/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  const { grades, statistics, pagination, isLoading, error, fetchAllGradesPaged } = useStudentGrades();
  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom"
  >("newest");
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

  const renderGradeBadge = (grade: number | null) => {
    const baseClass =
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ";
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
          "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm " +
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

      {/* Toolbar: Search (left) + Sort (right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
        {/* Search */}
        <div className="relative md:justify-self-start">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Tìm kiếm bài tập hoặc lớp học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            color="green"
            className="pl-10 h-12 w-full md:w-96"
            aria-label="Tìm kiếm điểm số"
          />
        </div>

        {/* Controls: Sort */}
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
              : "Bạn chưa có bài nộp nào được chấm điểm"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grades.map((grade) => {
            return (
              <div
                key={grade.id}
                className="bg-card/90 rounded-3xl border border-border shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-4 sm:p-5 hover:bg-green-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-green-600" />
                      <div className="text-sm font-semibold text-foreground truncate">
                        {grade.classroom?.name || "N/A"}
                      </div>
                    </div>
                    <div className="mt-1 text-base font-semibold text-foreground truncate">
                      {grade.assignmentTitle}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
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

                      {renderGradeBadge(grade.grade)}
                      {renderStatusBadge(grade.status)}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Ngày nộp: {grade.submittedAt ? formatDate(grade.submittedAt) : "Chưa nộp"}
                    </div>
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
            );
          })}

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