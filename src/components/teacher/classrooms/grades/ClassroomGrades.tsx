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
  FileText,
  HelpCircle,
  Download,
} from "lucide-react";
import { StatsGrid } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import GradeFiltersToolbar, { GradeSortKey, GradeStatus } from "@/components/teacher/grades/GradeFiltersToolbar";

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
  const [status, setStatus] = useState<GradeStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | string>("all");
  const [sortKey, setSortKey] = useState<GradeSortKey>("recent");
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
        if (assignmentFilter !== "all") usp.set("assignmentId", assignmentFilter);
        usp.set("sort", sortKey);
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
  }, [classroomId, status, search, assignmentFilter, sortKey]);

  // Debounce 300ms for search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sortKey === "grade") {
      copy.sort((a, b) => (b.grade ?? -1) - (a.grade ?? -1));
    } else if (sortKey === "due") {
      copy.sort((a, b) => {
        const at = a.assignment.dueDate ? new Date(a.assignment.dueDate).getTime() : Infinity;
        const bt = b.assignment.dueDate ? new Date(b.assignment.dueDate).getTime() : Infinity;
        return at - bt;
      });
    } else {
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
    }
    return copy;
  }, [rows, sortKey]);

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

  const exportCsv = () => {
    const header = ["student", "email", "assignment", "type", "due", "submitted", "grade"];
    const csv = [
      header.join(","),
      ...visibleRows.map((r) =>
        [
          r.student.fullname.replaceAll('"', '""'),
          r.student.email,
          r.assignment.title.replaceAll('"', '""'),
          r.assignment.type,
          r.assignment.dueDate ?? "",
          r.submittedAt ?? "",
          r.grade ?? "",
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Bảng điểm lớp học</h2>
          <p className="text-sm text-slate-600">Theo dõi điểm và tình trạng chấm bài.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Xuất CSV
        </Button>
      </div>

      <StatsGrid
        items={[
          { icon: <Award className="h-5 w-5" />, color: "from-emerald-200 to-green-200", label: "Điểm TB", value: metrics.average > 0 ? metrics.average.toFixed(1) : "N/A" },
          { icon: <CheckCircle2 className="h-5 w-5" />, color: "from-sky-200 to-blue-200", label: "Đã chấm", value: String(metrics.totalGraded) },
          { icon: <Clock className="h-5 w-5" />, color: "from-amber-200 to-orange-200", label: "Chưa chấm", value: String(metrics.totalPending) },
          { icon: <TrendingUp className="h-5 w-5" />, color: "from-blue-200 to-sky-200", label: "Cao nhất", value: metrics.highest !== null ? metrics.highest.toFixed(1) : "—" },
          { icon: <TrendingDown className="h-5 w-5" />, color: "from-rose-200 to-amber-200", label: "Thấp nhất", value: metrics.lowest !== null ? metrics.lowest.toFixed(1) : "—" },
        ]}
      />

      <GradeFiltersToolbar
        assignments={assignmentOptions.map(([id, title]) => ({ id, title }))}
        assignmentId={assignmentFilter}
        onAssignmentChange={setAssignmentFilter}
        status={status}
        onStatusChange={setStatus}
        sortKey={sortKey}
        onSortChange={setSortKey}
        search={searchInput}
        onSearchChange={setSearchInput}
      />

      {error ? (
        <EmptyState title="Không tải được bảng điểm" description={error} variant="teacher" />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : visibleRows.length === 0 ? (
        <EmptyState title="Không có dữ liệu" description="Không có bản ghi nào phù hợp với bộ lọc hiện tại." variant="teacher" />
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl border border-slate-100 overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-blue-50/60">
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[180px]">Học sinh</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[260px]">Bài tập</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[100px]">Loại</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[120px]">Hạn nộp</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[100px]">Đã nộp</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[72px]">Điểm</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[110px]">Nhận xét</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[110px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((r) => {
                  const statusBadge = getStatusBadge(r);
                  return (
                    <TableRow
                      key={r.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900 truncate whitespace-nowrap">
                        {r.student.fullname}
                      </TableCell>
                      <TableCell className="text-sm text-slate-800 overflow-hidden text-ellipsis whitespace-nowrap">
                        {r.assignment.title}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${
                            r.assignment.type === "ESSAY"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-pink-50 text-pink-700 border border-pink-100"
                          }`}
                        >
                          {r.assignment.type === "ESSAY" ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <HelpCircle className="h-3.5 w-3.5" />
                          )}
                          <span className="leading-none">{r.assignment.type === "ESSAY" ? "Tự luận" : "Trắc nghiệm"}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {r.assignment.dueDate
                          ? formatDate(r.assignment.dueDate)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                        {r.submittedAt ? formatDate(r.submittedAt) : "Chưa nộp"}
                      </TableCell>
                      <TableCell>
                        {r.grade !== null ? (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${getGradeBadgeClass(
                              r.grade,
                            )}`}
                          >
                            {r.grade.toFixed(1)}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${getGradeBadgeClass(
                              null,
                            )}`}
                          >
                            Chưa chấm
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.feedback ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFeedback(r)}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-colors shadow-sm"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>Xem</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Không có</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${statusBadge.className}`}
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
              <DialogContent onClose={() => setFeedbackOpen(false)}>
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
