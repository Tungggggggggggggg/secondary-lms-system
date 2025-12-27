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
import { exportToXlsx } from "@/lib/excel";

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
        usp.set("pageSize", "20000");
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

  const students = useMemo(() => {
    const map = new Map<string, { id: string; fullname: string; email: string }>();
    rows.forEach((r) => {
      if (!map.has(r.student.id)) {
        map.set(r.student.id, r.student);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.fullname || "").localeCompare(b.fullname || "", "vi", { sensitivity: "base" }));
  }, [rows]);

  const assignments = useMemo(() => {
    const map = new Map<string, { id: string; title: string; type: string; dueDate: string | null }>();
    rows.forEach((r) => {
      if (!map.has(r.assignment.id)) {
        map.set(r.assignment.id, r.assignment);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return at - bt;
    });
  }, [rows]);

  const studentAssignmentMap = useMemo(() => {
    const map = new Map<string, Map<string, Row>>();
    rows.forEach((r) => {
      let perStudent = map.get(r.student.id);
      if (!perStudent) {
        perStudent = new Map<string, Row>();
        map.set(r.student.id, perStudent);
      }
      perStudent.set(r.assignment.id, r);
    });
    return map;
  }, [rows]);

  const studentStats = useMemo(() => {
    const acc = new Map<string, { sum: number; gradedCount: number; pendingCount: number; latest: number }>();
    rows.forEach((r) => {
      const id = r.student.id;
      let s = acc.get(id);
      if (!s) {
        s = { sum: 0, gradedCount: 0, pendingCount: 0, latest: 0 };
        acc.set(id, s);
      }
      if (typeof r.grade === "number") {
        s.sum += r.grade;
        s.gradedCount += 1;
      } else {
        s.pendingCount += 1;
      }
      const t = r.submittedAt
        ? new Date(r.submittedAt).getTime()
        : r.assignment.dueDate
        ? new Date(r.assignment.dueDate).getTime()
        : 0;
      if (t > s.latest) s.latest = t;
    });

    const result = new Map<
      string,
      { average: number | null; gradedCount: number; pendingCount: number; latest: number }
    >();
    acc.forEach((s, id) => {
      result.set(id, {
        average: s.gradedCount > 0 ? s.sum / s.gradedCount : null,
        gradedCount: s.gradedCount,
        pendingCount: s.pendingCount,
        latest: s.latest,
      });
    });
    return result;
  }, [rows]);

  const filteredAssignments = useMemo(
    () =>
      assignments.filter(
        (a) => assignmentFilter === "all" || a.id === assignmentFilter,
      ),
    [assignments, assignmentFilter],
  );

  const sortedStudents = useMemo(() => {
    const list = [...students];
    if (sortKey === "grade") {
      list.sort((a, b) => {
        const sa = studentStats.get(a.id)?.average ?? -1;
        const sb = studentStats.get(b.id)?.average ?? -1;
        return sb - sa;
      });
    } else if (sortKey === "recent") {
      list.sort((a, b) => {
        const ta = studentStats.get(a.id)?.latest ?? 0;
        const tb = studentStats.get(b.id)?.latest ?? 0;
        return tb - ta;
      });
    }
    return list;
  }, [students, studentStats, sortKey]);

  const exportExcel = () => {
    const header = ["student", "email", "assignment", "type", "due", "submitted", "grade"];
    const rows = visibleRows.map((r) => [
      r.student.fullname,
      r.student.email,
      r.assignment.title,
      r.assignment.type,
      r.assignment.dueDate ?? "",
      r.submittedAt ?? "",
      r.grade ?? "",
    ]);
    exportToXlsx("grades", header, rows, { sheetName: "Grades" });
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
        <Button variant="outline" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Xuất Excel
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
      ) : rows.length === 0 ? (
        <EmptyState title="Không có dữ liệu" description="Không có bản ghi nào phù hợp với bộ lọc hiện tại." variant="teacher" />
      ) : (
        <>
          <div className="bg-white/90 rounded-3xl border border-slate-100 overflow-auto shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="bg-blue-50/60">
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[220px]">Học sinh</TableHead>
                  <TableHead className="text-xs font-semibold tracking-wide text-slate-600 uppercase w-[90px] text-center">Điểm TB</TableHead>
                  {filteredAssignments.map((a) => (
                    <TableHead
                      key={a.id}
                      className="text-xs font-semibold tracking-wide text-slate-600 uppercase min-w-[120px]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate" title={a.title}>{a.title || "Bài tập"}</span>
                        {a.dueDate && (
                          <span className="text-[11px] font-normal text-slate-500">
                            Hạn: {formatDate(a.dueDate)}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => {
                  const stats = studentStats.get(student.id);
                  return (
                    <TableRow
                      key={student.id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <TableCell className="whitespace-nowrap align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-slate-900 truncate">
                            {student.fullname || "Không tên"}
                          </span>
                          <span className="text-xs text-slate-500 truncate">
                            {student.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top">
                        {stats && stats.average !== null ? (
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${getGradeBadgeClass(
                              stats.average,
                            )}`}
                          >
                            {stats.average.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </TableCell>
                      {filteredAssignments.map((assignment) => {
                        const cellRow = studentAssignmentMap.get(student.id)?.get(assignment.id) || null;
                        if (!cellRow) {
                          return (
                            <TableCell key={assignment.id} className="text-center align-top">
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${getGradeBadgeClass(
                                  null,
                                )}`}
                              >
                                —
                              </span>
                            </TableCell>
                          );
                        }

                        const gradeValue = cellRow.grade;
                        const statusBadge = getStatusBadge(cellRow);
                        const label =
                          gradeValue !== null
                            ? gradeValue.toFixed(1)
                            : cellRow.submittedAt
                            ? "Chờ chấm"
                            : "Chưa nộp";

                        const tooltipParts = [
                          `Bài: ${assignment.title}`,
                          `Trạng thái: ${statusBadge.label}`,
                          `Hạn nộp: ${assignment.dueDate ? formatDate(assignment.dueDate) : "—"}`,
                          `Đã nộp: ${cellRow.submittedAt ? formatDate(cellRow.submittedAt) : "—"}`,
                          `Điểm: ${gradeValue !== null ? gradeValue.toFixed(1) : "—"}`,
                        ];
                        if (cellRow.feedback) {
                          tooltipParts.push(`Nhận xét: ${cellRow.feedback}`);
                        }

                        return (
                          <TableCell key={assignment.id} className="text-center align-top">
                            <button
                              type="button"
                              onClick={cellRow.feedback ? () => handleOpenFeedback(cellRow) : undefined}
                              className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none ${getGradeBadgeClass(
                                gradeValue,
                              )} ${
                                cellRow.feedback
                                  ? "hover:shadow-md hover:bg-opacity-90 transition-colors"
                                  : "cursor-default"
                              }`}
                              title={tooltipParts.join("\n")}
                            >
                              <span>{label}</span>
                              {cellRow.feedback && <MessageCircle className="h-3.5 w-3.5" />}
                            </button>
                          </TableCell>
                        );
                      })}
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
