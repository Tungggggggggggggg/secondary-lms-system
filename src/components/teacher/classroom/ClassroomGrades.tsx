"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Award,
  CheckCircle2,
  Clock,
  MessageCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type Row = {
  id: string;
  student: { id: string; fullname: string; email: string };
  assignment: { id: string; title: string; type: string; dueDate: string | null };
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  status: "submitted" | "graded" | "ungraded";
};

export default function ClassroomGrades() {
  const cardRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | "graded" | "ungraded">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | string>("all");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
  }, [rows]);

  useEffect(() => {
    async function load() {
      if (!classroomId) return;
      try {
        setIsLoading(true);
        setError(null);
        const usp = new URLSearchParams();
        if (status !== "all") usp.set("status", status);
        if (search.trim()) usp.set("search", search.trim());
        const res = await fetch(`/api/teachers/classrooms/${classroomId}/grades?${usp.toString()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Không thể tải bảng điểm");
        setRows(json.data || []);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [classroomId, status, search]);

  // Debounce 300ms for search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aTime = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : a.assignment.dueDate
        ? new Date(a.assignment.dueDate).getTime()
        : 0;
      const bTime = b.submittedAt
        ? new Date(b.submittedAt).getTime()
        : b.assignment.dueDate
        ? new Date(b.assignment.dueDate).getTime()
        : 0;
      return bTime - aTime;
    });
    return copy;
  }, [rows]);

  const metrics = useMemo(() => {
    if (!rows.length) {
      return {
        average: 0,
        totalGraded: 0,
        totalPending: 0,
        highest: null as number | null,
        lowest: null as number | null,
      };
    }
    let total = 0;
    let gradedCount = 0;
    let highest: number | null = null;
    let lowest: number | null = null;

    rows.forEach((r) => {
      if (typeof r.grade === "number") {
        total += r.grade;
        gradedCount += 1;
        if (highest === null || r.grade > highest) highest = r.grade;
        if (lowest === null || r.grade < lowest) lowest = r.grade;
      }
    });

    const average = gradedCount > 0 ? total / gradedCount : 0;
    const totalPending = rows.length - gradedCount;
    return { average, totalGraded: gradedCount, totalPending, highest, lowest };
  }, [rows]);

  const formatDate = (value: string | null) => {
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

  const getStatusBadge = (row: Row) => {
    if (row.status === "graded") {
      return {
        label: "Đã chấm",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    }
    if (row.submittedAt) {
      return {
        label: "Chờ chấm",
        className: "bg-amber-50 text-amber-700 border border-amber-100",
      };
    }
    return {
      label: "Chưa nộp",
      className: "bg-slate-50 text-slate-700 border border-slate-200",
    };
  };

  const handleOpenFeedback = (row: Row) => {
    if (!row.feedback) return;
    setSelectedRow(row);
    setFeedbackOpen(true);
  };

  const assignmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.assignment.id && r.assignment.title) {
        map.set(r.assignment.id, r.assignment.title);
      }
    });
    return Array.from(map.entries());
  }, [rows]);

  const visibleRows = useMemo(
    () =>
      sorted.filter(
        (r) => assignmentFilter === "all" || r.assignment.id === assignmentFilter,
      ),
    [sorted, assignmentFilter],
  );

  return (
    <div
      ref={cardRef}
      className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5 sm:p-7 space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
            Bảng điểm lớp học
          </h2>
          <p className="text-sm text-slate-600">
            Theo dõi điểm số và tình trạng chấm bài của học sinh trong lớp.
          </p>
        </div>
      </div>

      {/* KPI statistics */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(16,185,129,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-md">
            <Award className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-emerald-700/80 uppercase">
              Điểm trung bình
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {metrics.average > 0 ? metrics.average.toFixed(1) : "N/A"}
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
              {metrics.totalGraded}
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
              {metrics.totalPending}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(59,130,246,0.18)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-indigo-700/80 uppercase">
              Điểm cao nhất
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {metrics.highest !== null ? metrics.highest.toFixed(1) : "—"}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-rose-50 p-4 sm:p-5 shadow-[0_10px_30px_rgba(244,63,94,0.15)] flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-rose-700/80 uppercase">
              Điểm thấp nhất
            </div>
            <div className="text-2xl font-semibold text-slate-900">
              {metrics.lowest !== null ? metrics.lowest.toFixed(1) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Filter by assignment, status & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Lọc theo bài tập
            </span>
            <select
              value={assignmentFilter}
              onChange={(e) =>
                setAssignmentFilter(e.target.value as "all" | string)
              }
              className="px-4 py-2 bg-white/90 rounded-full border border-slate-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Tất cả bài tập</option>
              {assignmentOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Trạng thái
            </span>
            <select
              className="px-4 py-2 bg-white/90 rounded-full border border-slate-200 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "all" | "graded" | "ungraded")
              }
            >
              <option value="all">Tất cả</option>
              <option value="graded">Đã chấm</option>
              <option value="ungraded">Chưa chấm</option>
            </select>
          </div>
        </div>

        <Input
          placeholder="Tìm theo học sinh hoặc bài tập..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full sm:w-80 rounded-full border-slate-200 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-white/90 rounded-3xl p-10 text-center border border-slate-100 text-slate-600">
          Không có bản ghi nào phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl border border-slate-100 overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50/60">
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Học sinh</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Email</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Bài tập</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Loại</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Hạn nộp</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Đã nộp</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Điểm</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Nhận xét</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((r) => {
                  const statusBadge = getStatusBadge(r);
                  return (
                    <TableRow
                      key={r.id}
                      className="hover:bg-indigo-50/40 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900">
                        {r.student.fullname}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {r.student.email}
                      </TableCell>
                      <TableCell className="text-sm text-slate-800">
                        {r.assignment.title}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            r.assignment.type === "ESSAY"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-pink-50 text-pink-700 border border-pink-100"
                          }`}
                        >
                          {r.assignment.type === "ESSAY"
                            ? "📝 Tự luận"
                            : "❓ Trắc nghiệm"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {r.assignment.dueDate
                          ? formatDate(r.assignment.dueDate)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {r.submittedAt ? formatDate(r.submittedAt) : "Chưa nộp"}
                      </TableCell>
                      <TableCell>
                        {r.grade !== null ? (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getGradeBadgeClass(
                              r.grade,
                            )}`}
                          >
                            {r.grade.toFixed(1)}
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
                        {r.feedback ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors shadow-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có</span>
                        )}
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

          {selectedRow && (
            <Dialog
              open={feedbackOpen}
              onOpenChange={(open: boolean) => {
                setFeedbackOpen(open);
                if (!open) {
                  setSelectedRow(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nhận xét cho học sinh</DialogTitle>
                  <DialogDescription>
                    {selectedRow.student.fullname} - {selectedRow.assignment.title}
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 text-sm text-slate-800 whitespace-pre-line max-h-[50vh] overflow-y-auto">
                  {selectedRow.feedback}
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


