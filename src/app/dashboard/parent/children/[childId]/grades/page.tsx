"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import RateLimitDialog, {
  getRetryAfterSecondsFromResponse,
} from "@/components/shared/RateLimitDialog";
import { ArrowLeft, Award, CheckCircle2, Clock, ChevronDown, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParentGrades, GradeEntry } from "@/hooks/use-parent-grades";
import type { ParentStudentRelationship } from "@/types/parent";

// types imported from shared module; SWR fetcher is provided globally

/**
 * Trang Ä‘iá»ƒm sá»‘ cá»§a con (parent view)
 */
export default function ParentChildGradesPage() {
  const params = useParams();
  const childId = params.childId as string;

  const { grades, statistics, isLoading, isLoadingMore, hasMore, loadMore, error, fetchChildGrades } = useParentGrades();
  const [sortBy, setSortBy] = useState<
    "newest" | "grade_desc" | "grade_asc" | "due_date" | "classroom"
  >("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<
    { assignmentTitle: string; feedback: string } | null
  >(null);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryWindowDays, setSummaryWindowDays] = useState(7);
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  const [rateLimitRetryAfterSeconds, setRateLimitRetryAfterSeconds] = useState(0);
  const [summaryData, setSummaryData] = useState<
    | {
        title: string;
        summary: string;
        highlights: string[];
        concerns: string[];
        actionItems: string[];
        questionsForTeacher: string[];
        trend: "improving" | "declining" | "stable" | "unknown";
      }
    | null
  >(null);

  // Láº¥y thÃ´ng tin con Ä‘á»ƒ hiá»ƒn thá»‹ tÃªn
  const { data: childrenData, error: childrenError, isLoading: childrenLoading } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children", {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });

  const children = (childrenData?.success && childrenData?.items) ? childrenData.items : [];
  const selectedChild = children.find((rel) => rel.student.id === childId || rel.studentId === childId);

  // Load grades khi component mount và khi thay đổi khoảng thời gian
  useEffect(() => {
    if (childId) {
      fetchChildGrades(childId, summaryWindowDays);
    }
  }, [childId, fetchChildGrades, summaryWindowDays]);

  // Filter vÃ  sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = [...grades];

    // Filter theo search query
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.assignmentTitle.toLowerCase().includes(query) ||
          (g.classroom?.name ?? "").toLowerCase().includes(query) ||
          (g.feedback ?? "").toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "grade_desc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeB - gradeA; // Äiá»ƒm cao nháº¥t trÆ°á»›c
        });
        break;
      case "grade_asc":
        filtered.sort((a, b) => {
          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          return gradeA - gradeB; // Äiá»ƒm tháº¥p nháº¥t trÆ°á»›c
        });
        break;
      case "due_date":
        filtered.sort((a, b) => {
          const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return timeA - timeB; // Gáº§n háº¡n ná»™p trÆ°á»›c
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
      default:
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
  }, [deferredSearchQuery, grades, sortBy]);

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

  const fetchSmartSummary = async () => {
    try {
      setSummaryOpen(true);
      setSummaryLoading(true);
      setSummaryError(null);
      setSummaryData(null);

      const res = await fetch("/api/ai/parent/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          windowDays: summaryWindowDays,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const retryAfterSeconds = getRetryAfterSecondsFromResponse(res, json) ?? 60;
        setRateLimitRetryAfterSeconds(retryAfterSeconds);
        setRateLimitOpen(true);
        return;
      }
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tạo tóm tắt học tập");
      }

      setSummaryData(json.data);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Có lỗi xảy ra khi tạo tóm tắt");
    } finally {
      setSummaryLoading(false);
    }
  };

  const trendLabel = (trend: "improving" | "declining" | "stable" | "unknown") => {
    switch (trend) {
      case "improving":
        return "Có tiến bộ";
      case "declining":
        return "Có dấu hiệu giảm";
      case "stable":
        return "Ổn định";
      default:
        return "Chưa đủ dữ liệu";
    }
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
      "Lớp học",
      "Bài tập",
      "Loại",
      "Điểm",
      "Nhận xét",
      "Ngày nộp",
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
    a.download = `diem-so-${selectedChild?.student.fullname || childId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (childrenLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (childrenError || !childrenData?.success || !selectedChild) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Không tìm thấy thông tin học sinh</h3>
          <p className="text-sm mb-4">Vui lòng quay lại danh sách con.</p>
          <Link href="/dashboard/parent/children">
            <Button>Quay lại</Button>
          </Link>
        </div>
      </div>
    );
  }

  const student = selectedChild.student;

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link href={`/dashboard/parent/children/${childId}`}>
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="font-semibold mb-2">Lỗi tải danh sách điểm số</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={() => fetchChildGrades(childId, summaryWindowDays)}>Thử lại</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <RateLimitDialog
        open={rateLimitOpen}
        onOpenChange={setRateLimitOpen}
        retryAfterSeconds={rateLimitRetryAfterSeconds}
        title="Bạn đang yêu cầu AI quá nhanh"
        description="Hệ thống cần một chút thời gian để phục vụ ổn định."
        onRetry={fetchSmartSummary}
      />
      {/* Back button */}
      <div>
        <Link href={`/dashboard/parent/children/${childId}`}>
          <Button variant="ghost" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </Link>
      </div>

      {/* Header + Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight mb-1">
            Điểm số của {student.fullname}
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Tổng hợp kết quả học tập của con bạn ở tất cả lớp học.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Khoảng:</span>
            <select
              value={summaryWindowDays}
              onChange={(e) => setSummaryWindowDays(Number(e.target.value) || 7)}
              className="appearance-none px-3 py-2 bg-white/90 rounded-full border border-amber-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              aria-label="Chọn khoảng thời gian tóm tắt"
              disabled={summaryLoading}
            >
              <option value={7}>7 ngày</option>
              <option value={14}>14 ngày</option>
              <option value={30}>30 ngày</option>
              <option value={60}>60 ngày</option>
            </select>
          </div>

          <Button
            onClick={fetchSmartSummary}
            className="rounded-full px-5"
            variant="outline"
            disabled={summaryLoading}
          >
            {summaryLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tạo tóm tắt...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI tóm tắt học tập
              </span>
            )}
          </Button>
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

      {/* Filter vÃ  Search */}
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
              aria-label="Sắp xếp theo"
              className="appearance-none px-4 pr-9 py-2 bg-white/90 rounded-full border border-amber-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            >
              <option value="newest">Mới nhất</option>
              <option value="grade_desc">Điểm cao nhất</option>
              <option value="grade_asc">Điểm thấp nhất</option>
              <option value="due_date">Hạn nộp</option>
              <option value="classroom">Theo lớp học</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500/70" />
          </div>
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm bài tập hoặc lớp học..."
          aria-label="Tìm kiếm bài tập hoặc lớp học"
          className="flex-1 px-4 py-2 bg-white/90 rounded-full border border-amber-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
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
              ? "Con bạn chưa có bài nộp nào được chấm điểm"
              : "Không tìm thấy điểm số nào phù hợp với bộ lọc"}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-amber-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/60">
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
                      className="hover:bg-amber-50/40 transition-colors"
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
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-orange-50 text-orange-700 border border-orange-100"
                          }`}
                        >
                          {grade.assignmentType === "ESSAY"
                            ? "Tự luận"
                            : "Trắc nghiệm"}
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
                            className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-200 transition-colors shadow-sm"
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

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => loadMore()}
                disabled={isLoadingMore || isLoading}
                className="rounded-full px-6"
              >
                {isLoadingMore ? "Đang tải..." : "Tải thêm"}
              </Button>
            </div>
          )}

          {selectedFeedback && (
            <Dialog
              open={feedbackOpen}
              onOpenChange={(open: boolean) => {
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

          <Dialog
            open={summaryOpen}
            onOpenChange={(open: boolean) => {
              setSummaryOpen(open);
              if (!open) {
                setSummaryError(null);
                setSummaryData(null);
              }
            }}
          >
            <DialogContent onClose={() => setSummaryOpen(false)}>
              <DialogHeader>
                <DialogTitle>{"T\u00f3m t\u1eaft h\u1ecdc t\u1eadp (AI)"}</DialogTitle>
                <DialogDescription>
                  {"D\u00e0nh cho ph\u1ee5 huynh \u2014 th\u1eddi gian "}{summaryWindowDays}{" ng\u00e0y g\u1ea7n nh\u1ea5t."}
                </DialogDescription>
              </DialogHeader>

              {summaryLoading && (
                <div className="px-6 py-8 text-sm text-slate-700 inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {"\u0110ang t\u1ea1o t\u00f3m t\u1eaft..."}
                </div>
              )}

              {!summaryLoading && summaryError && (
                <div className="px-6 py-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {summaryError}
                  </div>
                </div>
              )}

              {!summaryLoading && !summaryError && summaryData && (
                <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{summaryData.title}</div>
                    <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{summaryData.summary}</div>
                    <div className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
                      {"Xu h\u01b0\u1edbng: "}{trendLabel(summaryData.trend)}
                    </div>
                  </div>

                  {summaryData.highlights.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{"\u0110i\u1ec3m n\u1ed5i b\u1eadt"}</div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-800 space-y-1">
                        {summaryData.highlights.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryData.concerns.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{"\u0110i\u1ec3m c\u1ea7n l\u01b0u \u00fd"}</div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-800 space-y-1">
                        {summaryData.concerns.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryData.actionItems.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{"G\u1ee3i \u00fd h\u00e0nh \u0111\u1ed9ng"}</div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-800 space-y-1">
                        {summaryData.actionItems.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryData.questionsForTeacher.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{"C\u00e2u h\u1ecfi n\u00ean h\u1ecfi gi\u00e1o vi\u00ean"}</div>
                      <ul className="mt-2 list-disc pl-5 text-sm text-slate-800 space-y-1">
                        {summaryData.questionsForTeacher.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSummaryOpen(false)}>
                  {"\u0110\u00f3ng"}
                </Button>
                <Button onClick={fetchSmartSummary} disabled={summaryLoading}>
                  {"T\u1ea1o l\u1ea1i"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}



