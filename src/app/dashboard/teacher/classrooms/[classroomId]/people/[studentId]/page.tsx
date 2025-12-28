"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatsGrid } from "@/components/shared";
import { Users, NotebookText, BarChart3, GraduationCap, ChevronRight, MessageCircle } from "lucide-react";

type ParentInfo = {
  id: string;
  fullname: string;
  email: string;
};

type StudentInfo = {
  id: string;
  fullname: string;
  email: string;
  joinedAt: string;
  parents: ParentInfo[];
};

type GradeRow = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  dueDate?: string | null;
  status: "pending" | "submitted" | "graded";
};

type Statistics = {
  totalSubmissions: number;
  totalGraded: number;
  totalPending: number;
  averageGrade: number;
};

type ApiResponse = {
  success?: boolean;
  student?: StudentInfo;
  data?: GradeRow[];
  statistics?: Statistics;
  message?: string;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
}

function getGradeBadgeClass(grade: number | null) {
  if (grade === null) return "bg-amber-50 text-amber-700 border border-amber-100";
  if (grade >= 5) return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  return "bg-rose-50 text-rose-700 border border-rose-100";
}

function getStatusBadge(row: GradeRow) {
  const due = row.dueDate ? new Date(row.dueDate) : null;
  const overdue = !row.submittedAt && !!due && due.getTime() < Date.now();

  if (overdue) {
    return {
      label: "Quá hạn",
      className: "bg-rose-50 text-rose-700 border border-rose-100",
    };
  }

  if (row.status === "graded" || row.grade !== null) {
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
}

export default function TeacherStudentDetailPage() {
  const { classroomId, studentId } = useParams() as { classroomId: string; studentId: string };
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "grade">("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | GradeRow["status"]>("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<GradeRow | null>(null);

  useEffect(() => {
    async function load() {
      if (!classroomId || !studentId) return;
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/teachers/classrooms/${classroomId}/students/${studentId}/grades`, { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || json?.success === false) throw new Error(json?.message || "Không thể tải điểm");
        setRows(Array.isArray(json.data) ? json.data : []);
        setStudent(json.student ?? null);
        setStats(json.statistics ?? null);
      } catch (e: any) {
        setError(e?.message || "Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [classroomId, studentId]);

  const sorted = useMemo(() => {
    const filtered = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);
    const copy = [...filtered];
    switch (sortBy) {
      case "oldest":
        copy.sort((a, b) => {
          const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return ta - tb;
        });
        break;
      case "grade":
        copy.sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));
        break;
      case "newest":
      default:
        copy.sort((a, b) => {
          const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return tb - ta;
        });
        break;
    }
    return copy;
  }, [rows, sortBy, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-200 to-sky-200 flex items-center justify-center text-indigo-700 font-extrabold text-xl">
              {(student?.fullname || studentId).trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-slate-900 truncate">
                {student?.fullname || "Học sinh"}
              </div>
              <div className="text-sm text-slate-600 truncate">{student?.email || ""}</div>
              <div className="mt-2 text-xs text-slate-500">
                Tham gia lớp: {student?.joinedAt ? new Date(student.joinedAt).toLocaleString("vi-VN") : "—"}
              </div>

              {student?.parents && student.parents.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {student.parents.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      title={p.email}
                    >
                      <span className="font-semibold">PH</span>
                      <span className="truncate max-w-[220px]">{p.fullname}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-slate-500">Chưa liên kết phụ huynh</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
            >
              Tất cả
            </Button>
            <Button
              variant={statusFilter === "graded" ? "default" : "outline"}
              onClick={() => setStatusFilter("graded")}
            >
              Đã chấm
            </Button>
            <Button
              variant={statusFilter === "submitted" ? "default" : "outline"}
              onClick={() => setStatusFilter("submitted")}
            >
              Chờ chấm
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
            >
              Chưa nộp
            </Button>
          </div>
        </div>
      </div>

      <StatsGrid
        items={[
          {
            icon: <Users className="h-5 w-5" />,
            color: "from-blue-200 to-indigo-200",
            label: "Bài tập",
            value: String(stats?.totalSubmissions ?? 0),
            subtitle: "Tổng số bài trong lớp",
          },
          {
            icon: <NotebookText className="h-5 w-5" />,
            color: "from-emerald-200 to-green-200",
            label: "Đã chấm",
            value: String(stats?.totalGraded ?? 0),
            subtitle: "Đã có điểm",
          },
          {
            icon: <BarChart3 className="h-5 w-5" />,
            color: "from-amber-200 to-orange-200",
            label: "Chưa chấm",
            value: String(stats?.totalPending ?? 0),
            subtitle: "Chưa có điểm",
          },
          {
            icon: <GraduationCap className="h-5 w-5" />,
            color: "from-sky-200 to-indigo-200",
            label: "Điểm TB",
            value: typeof stats?.averageGrade === "number" ? stats.averageGrade.toFixed(1) : "0.0",
            subtitle: "Trung bình bài đã chấm",
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Bảng điểm</div>
          <div className="flex items-center gap-2">
            <Button variant={sortBy === "newest" ? "default" : "outline"} onClick={() => setSortBy("newest")}>
              Mới nhất
            </Button>
            <Button variant={sortBy === "oldest" ? "default" : "outline"} onClick={() => setSortBy("oldest")}>
              Cũ nhất
            </Button>
            <Button variant={sortBy === "grade" ? "default" : "outline"} onClick={() => setSortBy("grade")}>
              Điểm cao
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {sorted.length === 0 ? (
            <div className="text-sm text-slate-600">Không có dữ liệu.</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((g) => {
                const statusBadge = getStatusBadge(g);

                const gradeLabel =
                  g.grade !== null
                    ? g.grade.toFixed(1)
                    : g.submittedAt
                    ? "Chờ"
                    : statusBadge.label === "Quá hạn"
                    ? "0"
                    : "—";

                const rowTitle = `${g.assignmentTitle} (${statusBadge.label})`;

                return (
                  <div key={g.id} className="rounded-2xl border border-slate-100 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelected(g);
                        setDetailOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(g);
                          setDetailOpen(true);
                        }
                      }}
                      aria-label={rowTitle}
                      className="group cursor-pointer rounded-2xl p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate" title={g.assignmentTitle}>
                                {g.assignmentTitle}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {g.assignmentType}
                                </span>
                                {g.feedback ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    Có nhận xét
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>Hạn: {formatDateTime(g.dueDate ?? null)}</div>
                            <div>Đã nộp: {g.submittedAt ? formatDateTime(g.submittedAt) : "Chưa nộp"}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm whitespace-nowrap leading-none border ${getGradeBadgeClass(
                                g.grade,
                              )}`}
                              title={statusBadge.label}
                            >
                              {gradeLabel}
                            </span>
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap leading-none ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>

                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors mt-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <Dialog
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelected(null);
          }}
        >
          <DialogContent onClose={() => setDetailOpen(false)} className="max-w-xl">
            <DialogHeader variant="teacher">
              <DialogTitle variant="teacher">Chi tiết bài</DialogTitle>
              <DialogDescription variant="teacher">{selected.assignmentTitle}</DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-3 text-sm text-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Loại</div>
                  <div className="mt-1 font-semibold">{selected.assignmentType}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Hạn nộp</div>
                  <div className="mt-1 font-semibold">{formatDateTime(selected.dueDate ?? null)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Đã nộp</div>
                  <div className="mt-1 font-semibold">{formatDateTime(selected.submittedAt)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-600">Điểm</div>
                  <div className="mt-1 font-semibold">
                    {selected.grade !== null ? selected.grade.toFixed(1) : "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-600">Nhận xét</div>
                <div className="mt-2 whitespace-pre-line text-slate-800 max-h-[30vh] overflow-y-auto">
                  {selected.feedback ? selected.feedback : "—"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setDetailOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


