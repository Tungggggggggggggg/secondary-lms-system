"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  NotebookText,
  BarChart3,
  GraduationCap,
  User,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  FileX2,
} from "lucide-react";
import { StatsGrid } from "@/components/shared";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/hooks/use-toast";
import Avatar from "@/components/ui/avatar";
import GradebookGrid, {
  type GradebookAssignment,
  type GradebookCell,
  type GradebookStudent,
} from "@/components/teacher/classrooms/grades/GradebookGrid";

type GradebookStatistics = {
  graded: number;
  submitted: number;
  missing: number;
  overdueMissing: number;
  averageGrade: number | null;
  highest: number | null;
  lowest: number | null;
};

type GradebookPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ColumnPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type OverviewStats = {
  totalStudents: number;
  totalAssignments: number;
  submissionRate: number;
  averageGrade: number | null;
  highest: number | null;
  lowest: number | null;
  overdueMissing: number;
};

type StudentSummary = {
  id: string;
  fullname: string;
  email: string;
  stats: {
    totalAssignments: number;
    submittedCount: number;
    gradedCount: number;
    overdueMissingCount: number;
    averageGrade: number | null;
  };
};

type StudentsApiResponse = {
  success?: boolean;
  data?: {
    students?: StudentSummary[];
    overview?: OverviewStats;
    pagination?: GradebookPagination;
  };
  message?: string;
};

type AssignmentSummary = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  stats: {
    totalStudents: number;
    submittedCount: number;
    gradedCount: number;
    pendingCount: number;
    overdueMissingCount: number;
    averageGrade: number | null;
    highest: number | null;
    lowest: number | null;
  };
};

type AssignmentsApiResponse = {
  success?: boolean;
  data?: {
    assignments?: AssignmentSummary[];
    pagination?: GradebookPagination;
  };
  message?: string;
};

type StudentGradeRow = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  dueDate: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  status: "graded" | "submitted" | "pending";
};

type StudentGradesResponse = {
  success?: boolean;
  student?: {
    id: string;
    fullname: string;
    email: string;
    joinedAt: string;
  };
  data?: StudentGradeRow[];
  statistics?: {
    totalSubmissions: number;
    totalGraded: number;
    totalPending: number;
    averageGrade: number;
  };
  message?: string;
};

type MatrixApiResponse = {
  success?: boolean;
  data?: {
    students?: GradebookStudent[];
    assignments?: GradebookAssignment[];
    cells?: GradebookCell[];
    statistics?: GradebookStatistics;
    pagination?: GradebookPagination;
    columnPagination?: ColumnPagination;
  };
  message?: string;
};

export default function ClassroomGrades() {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const classroomId = params.classroomId as string;

  const getInitials = (name: string) => {
    const parts = (name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || "HS";
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("vi-VN");
  };

  const [tab, setTab] = useState<"students" | "assignments" | "matrix">("students");

  const [overview, setOverview] = useState<OverviewStats | null>(null);

  const [studentSummaries, setStudentSummaries] = useState<StudentSummary[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(10);
  const [studentPagination, setStudentPagination] = useState<GradebookPagination | null>(null);

  const [assignmentSummaries, setAssignmentSummaries] = useState<AssignmentSummary[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState(10);
  const [assignmentPagination, setAssignmentPagination] = useState<GradebookPagination | null>(null);

  const [matrixStudents, setMatrixStudents] = useState<GradebookStudent[]>([]);
  const [matrixAssignments, setMatrixAssignments] = useState<GradebookAssignment[]>([]);
  const [matrixCells, setMatrixCells] = useState<GradebookCell[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixPageSize, setMatrixPageSize] = useState(10);
  const [matrixColumns, setMatrixColumns] = useState(8);
  const [matrixColPage, setMatrixColPage] = useState(1);
  const [matrixPagination, setMatrixPagination] = useState<GradebookPagination | null>(null);
  const [matrixColumnPagination, setMatrixColumnPagination] = useState<ColumnPagination | null>(null);
  const [exporting, setExporting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<StudentSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<StudentGradeRow[]>([]);
  const [detailStats, setDetailStats] = useState<StudentGradesResponse["statistics"] | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
  }, [tab]);

  useEffect(() => {
    async function loadStudents() {
      if (!classroomId) return;
      if (tab !== "students") return;
      try {
        setStudentLoading(true);
        setStudentError(null);

        const usp = new URLSearchParams();
        if (studentSearch.trim()) usp.set("search", studentSearch.trim());
        usp.set("page", String(studentPage));
        usp.set("pageSize", String(studentPageSize));

        const res = await fetch(
          `/api/teachers/classrooms/${classroomId}/gradebook/students?${usp.toString()}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as StudentsApiResponse;
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Không thể tải danh sách học sinh");
        }

        setStudentSummaries(Array.isArray(json?.data?.students) ? json.data.students : []);
        setStudentPagination(json?.data?.pagination ?? null);
        setOverview(json?.data?.overview ?? null);
      } catch (e) {
        setStudentError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setStudentLoading(false);
      }
    }
    loadStudents();
  }, [classroomId, tab, studentSearch, studentPage, studentPageSize]);

  useEffect(() => {
    async function loadAssignments() {
      if (!classroomId) return;
      if (tab !== "assignments") return;
      try {
        setAssignmentLoading(true);
        setAssignmentError(null);

        const usp = new URLSearchParams();
        if (assignmentSearch.trim()) usp.set("search", assignmentSearch.trim());
        usp.set("page", String(assignmentPage));
        usp.set("pageSize", String(assignmentPageSize));

        const res = await fetch(
          `/api/teachers/classrooms/${classroomId}/gradebook/assignments?${usp.toString()}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as AssignmentsApiResponse;
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Không thể tải danh sách bài tập");
        }

        setAssignmentSummaries(Array.isArray(json?.data?.assignments) ? json.data.assignments : []);
        setAssignmentPagination(json?.data?.pagination ?? null);
      } catch (e) {
        setAssignmentError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setAssignmentLoading(false);
      }
    }
    loadAssignments();
  }, [classroomId, tab, assignmentSearch, assignmentPage, assignmentPageSize]);

  useEffect(() => {
    async function loadMatrix() {
      if (!classroomId) return;
      if (tab !== "matrix") return;
      try {
        setMatrixLoading(true);
        setMatrixError(null);

        const usp = new URLSearchParams();
        if (matrixSearch.trim()) usp.set("search", matrixSearch.trim());
        usp.set("page", String(matrixPage));
        usp.set("pageSize", String(matrixPageSize));
        usp.set("columns", String(matrixColumns));
        usp.set("colPage", String(matrixColPage));

        const res = await fetch(`/api/teachers/classrooms/${classroomId}/gradebook?${usp.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as MatrixApiResponse;
        if (!res.ok || json?.success === false) {
          throw new Error(json?.message || "Không thể tải bảng điểm");
        }

        setMatrixStudents(Array.isArray(json?.data?.students) ? json.data.students : []);
        setMatrixAssignments(Array.isArray(json?.data?.assignments) ? json.data.assignments : []);
        setMatrixCells(Array.isArray(json?.data?.cells) ? json.data.cells : []);
        setMatrixPagination(json?.data?.pagination ?? null);
        setMatrixColumnPagination(json?.data?.columnPagination ?? null);
      } catch (e) {
        setMatrixError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      } finally {
        setMatrixLoading(false);
      }
    }
    loadMatrix();
  }, [classroomId, tab, matrixSearch, matrixPage, matrixPageSize, matrixColumns, matrixColPage]);

  const statsItems = useMemo(() => {
    if (!overview) return [];

    const rangeText = `${overview.lowest !== null ? overview.lowest.toFixed(1) : "—"}–${
      overview.highest !== null ? overview.highest.toFixed(1) : "—"
    }`;

    return [
      {
        icon: <Users className="h-5 w-5" />,
        color: "from-blue-200 to-indigo-200",
        label: "Học sinh",
        value: String(overview.totalStudents ?? 0),
      },
      {
        icon: <NotebookText className="h-5 w-5" />,
        color: "from-sky-200 to-indigo-200",
        label: "Bài tập",
        value: String(overview.totalAssignments ?? 0),
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        color: "from-emerald-200 to-green-200",
        label: "Tỷ lệ nộp",
        value: `${Math.round(overview.submissionRate)}%`,
      },
      {
        icon: <GraduationCap className="h-5 w-5" />,
        color: "from-amber-200 to-orange-200",
        label: "Điểm TB",
        value: overview.averageGrade !== null ? overview.averageGrade.toFixed(1) : "—",
        subtitle: `Thấp/Cao: ${rangeText} • Quá hạn: ${overview.overdueMissing ?? 0}`,
      },
    ];
  }, [overview]);

  const openStudentDetail = async (student: StudentSummary) => {
    if (!classroomId) return;
    setDetailOpen(true);
    setDetailStudent(student);
    setDetailRows([]);
    setDetailStats(null);
    setDetailError(null);
    try {
      setDetailLoading(true);
      const res = await fetch(
        `/api/teachers/classrooms/${classroomId}/students/${student.id}/grades`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as StudentGradesResponse;
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể tải điểm của học sinh");
      }
      setDetailRows(Array.isArray(json?.data) ? json.data : []);
      setDetailStats(json?.statistics ?? null);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadExport = async () => {
    if (!classroomId) return;
    try {
      setExporting(true);
      const usp = new URLSearchParams();
      if (matrixSearch.trim()) usp.set("search", matrixSearch.trim());
      usp.set("sort", "recent");
      usp.set("limit", "5000");

      const res = await fetch(`/api/teachers/classrooms/${classroomId}/grades/export?${usp.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Không thể xuất Excel");
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const filename = decodeURIComponent((m?.[1] || m?.[2] || "bang-diem.xlsx").trim());

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[ClassroomGrades] export error", e);
      toast({
        title: "Không thể xuất Excel",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <div
        ref={cardRef}
        className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5 sm:p-7 space-y-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Điểm số lớp học</h2>
            <p className="text-sm text-slate-600">Theo dõi điểm và tình trạng chấm bài.</p>
          </div>

          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="students">Theo học sinh</TabsTrigger>
            <TabsTrigger value="assignments">Theo bài tập</TabsTrigger>
            <TabsTrigger value="matrix">Ma trận</TabsTrigger>
          </TabsList>
        </div>

        <StatsGrid items={statsItems} />

        <TabsContent value="students" className="mt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <Input
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentPage(1);
                }}
                placeholder="Tìm học sinh theo tên hoặc email..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Select
                value={String(studentPageSize)}
                onChange={(e) => {
                  setStudentPageSize(Number(e.target.value));
                  setStudentPage(1);
                }}
              >
                <option value="10">10 HS/trang</option>
                <option value="15">15 HS/trang</option>
                <option value="20">20 HS/trang</option>
                <option value="30">30 HS/trang</option>
                <option value="50">50 HS/trang</option>
              </Select>
            </div>
          </div>

          {studentError ? (
            <EmptyState title="Không tải được danh sách" description={studentError} variant="teacher" />
          ) : studentLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : studentSummaries.length === 0 ? (
            <EmptyState
              title="Không có dữ liệu"
              description="Không có học sinh nào phù hợp với tìm kiếm hiện tại."
              variant="teacher"
            />
          ) : (
            <div className="space-y-3">
              {studentSummaries.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 border rounded-2xl bg-white hover:bg-slate-50/40 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 font-bold text-base">
                        {s.fullname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-900">{s.fullname}</div>
                      <div className="truncate text-sm text-slate-600">{s.email}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-white">
                          {s.stats.submittedCount}/{s.stats.totalAssignments} bài
                        </Badge>
                        {s.stats.overdueMissingCount > 0 && (
                          <Badge variant="warning">
                            Quá hạn: {s.stats.overdueMissingCount}
                          </Badge>
                        )}
                        {s.stats.averageGrade !== null && (
                          <Badge variant="success">ĐTB: {s.stats.averageGrade.toFixed(1)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void openStudentDetail(s);
                      }}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                </div>
              ))}

              {studentPagination && studentPagination.total > studentPagination.pageSize && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 text-sm text-slate-600">
                  <div>
                    Trang{" "}
                    <span className="font-semibold text-slate-900">{studentPage}</span> /{" "}
                    {Math.max(1, studentPagination.totalPages ?? 1)} • Tổng{" "}
                    <span className="font-semibold text-slate-900">
                      {studentPagination.total.toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentPage(Math.max(1, studentPage - 1))}
                      disabled={studentPage <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentPage(studentPage + 1)}
                      disabled={studentPage >= Math.max(1, studentPagination.totalPages ?? 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <Input
                value={assignmentSearch}
                onChange={(e) => {
                  setAssignmentSearch(e.target.value);
                  setAssignmentPage(1);
                }}
                placeholder="Tìm bài tập theo tiêu đề..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Select
                value={String(assignmentPageSize)}
                onChange={(e) => {
                  setAssignmentPageSize(Number(e.target.value));
                  setAssignmentPage(1);
                }}
              >
                <option value="10">10 bài/trang</option>
                <option value="15">15 bài/trang</option>
                <option value="20">20 bài/trang</option>
                <option value="30">30 bài/trang</option>
                <option value="50">50 bài/trang</option>
              </Select>
            </div>
          </div>

          {assignmentError ? (
            <EmptyState title="Không tải được danh sách" description={assignmentError} variant="teacher" />
          ) : assignmentLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assignmentSummaries.length === 0 ? (
            <EmptyState
              title="Không có dữ liệu"
              description="Không có bài tập nào phù hợp với tìm kiếm hiện tại."
              variant="teacher"
            />
          ) : (
            <div className="space-y-3">
              {assignmentSummaries.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-2xl bg-white hover:bg-slate-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">{a.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 items-center text-sm text-slate-600">
                      <Badge variant="outline" className="bg-white">
                        {a.type}
                      </Badge>
                      <span className="text-xs">Hạn: {a.dueDate ? new Date(a.dueDate).toLocaleDateString("vi-VN") : "—"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                    <Badge variant="outline" className="bg-white">
                      {a.stats.submittedCount}/{a.stats.totalStudents} nộp
                    </Badge>
                    {a.stats.overdueMissingCount > 0 && (
                      <Badge variant="warning">Quá hạn: {a.stats.overdueMissingCount}</Badge>
                    )}
                    {a.stats.averageGrade !== null && (
                      <Badge variant="success">ĐTB: {a.stats.averageGrade.toFixed(1)}</Badge>
                    )}
                    <Badge variant="outline" className="bg-white">
                      Chờ: {a.stats.pendingCount}
                    </Badge>
                  </div>
                </div>
              ))}

              {assignmentPagination && assignmentPagination.total > assignmentPagination.pageSize && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 text-sm text-slate-600">
                  <div>
                    Trang{" "}
                    <span className="font-semibold text-slate-900">{assignmentPage}</span> /{" "}
                    {Math.max(1, assignmentPagination.totalPages ?? 1)} • Tổng{" "}
                    <span className="font-semibold text-slate-900">
                      {assignmentPagination.total.toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAssignmentPage(Math.max(1, assignmentPage - 1))}
                      disabled={assignmentPage <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAssignmentPage(assignmentPage + 1)}
                      disabled={assignmentPage >= Math.max(1, assignmentPagination.totalPages ?? 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="mt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <Input
                value={matrixSearch}
                onChange={(e) => {
                  setMatrixSearch(e.target.value);
                  setMatrixPage(1);
                }}
                placeholder="Tìm học sinh theo tên hoặc email..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Select
                value={String(matrixColumns)}
                onChange={(e) => {
                  setMatrixColumns(Number(e.target.value));
                  setMatrixColPage(1);
                }}
              >
                <option value="6">6 cột</option>
                <option value="8">8 cột</option>
                <option value="10">10 cột</option>
                <option value="12">12 cột</option>
                <option value="15">15 cột</option>
                <option value="20">20 cột</option>
                <option value="30">30 cột</option>
              </Select>

              <Select
                value={String(matrixPageSize)}
                onChange={(e) => {
                  setMatrixPageSize(Number(e.target.value));
                  setMatrixPage(1);
                }}
              >
                <option value="10">10 HS/trang</option>
                <option value="15">15 HS/trang</option>
                <option value="20">20 HS/trang</option>
                <option value="30">30 HS/trang</option>
                <option value="50">50 HS/trang</option>
              </Select>

              <Button
                type="button"
                onClick={downloadExport}
                disabled={exporting || matrixLoading}
              >
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </Button>
            </div>
          </div>

          {matrixColumnPagination && matrixColumnPagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-600">
              <div>
                Cột bài tập: Trang{" "}
                <span className="font-semibold text-slate-900">{matrixColPage}</span> /{" "}
                {Math.max(1, matrixColumnPagination.totalPages ?? 1)}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMatrixColPage(Math.max(1, matrixColPage - 1))}
                  disabled={matrixColPage <= 1}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMatrixColPage(matrixColPage + 1)}
                  disabled={matrixColPage >= Math.max(1, matrixColumnPagination.totalPages ?? 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}

          {matrixError ? (
            <EmptyState title="Không tải được bảng điểm" description={matrixError} variant="teacher" />
          ) : matrixLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : matrixStudents.length === 0 ? (
            <EmptyState
              title="Không có dữ liệu"
              description="Không có học sinh nào phù hợp với tìm kiếm hiện tại."
              variant="teacher"
            />
          ) : (
            <>
              <GradebookGrid students={matrixStudents} assignments={matrixAssignments} cells={matrixCells} />

              {matrixPagination && matrixPagination.total > matrixPagination.pageSize && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 text-sm text-slate-600">
                  <div>
                    Trang{" "}
                    <span className="font-semibold text-slate-900">{matrixPage}</span> /{" "}
                    {Math.max(1, matrixPagination.totalPages ?? 1)} • Tổng{" "}
                    <span className="font-semibold text-slate-900">
                      {matrixPagination.total.toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMatrixPage(Math.max(1, matrixPage - 1))}
                      disabled={matrixPage <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMatrixPage(matrixPage + 1)}
                      disabled={matrixPage >= Math.max(1, matrixPagination.totalPages ?? 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

      {detailStudent && (
        <Dialog
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v);
            if (!v) {
              setDetailStudent(null);
              setDetailRows([]);
              setDetailStats(null);
              setDetailError(null);
            }
          }}
        >
          <DialogContent
            className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)] max-w-6xl 2xl:max-w-[1200px]"
            onClose={() => setDetailOpen(false)}
          >
            <DialogHeader variant="teacher">
              <DialogTitle variant="teacher">Chi tiết điểm học sinh</DialogTitle>
              <DialogDescription variant="teacher" className="mt-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    fullname={detailStudent.fullname}
                    email={detailStudent.email}
                    size="lg"
                    className="border border-blue-200"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold truncate">
                      <User className="h-4 w-4 text-blue-700" />
                      <span className="truncate">{detailStudent.fullname}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-blue-700 truncate">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{detailStudent.email}</span>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-5 space-y-5">
              {detailError ? (
                <EmptyState title="Không tải được dữ liệu" description={detailError} variant="teacher" />
              ) : detailLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Skeleton className="h-[88px] w-full rounded-2xl" />
                    <Skeleton className="h-[88px] w-full rounded-2xl" />
                    <Skeleton className="h-[88px] w-full rounded-2xl" />
                    <Skeleton className="h-[88px] w-full rounded-2xl" />
                  </div>
                  <Skeleton className="h-[240px] w-full rounded-2xl" />
                </div>
              ) : (
                <>
                  {detailStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-blue-700">Điểm TB</div>
                          <div className="h-9 w-9 rounded-xl bg-white/80 border border-blue-100 flex items-center justify-center text-blue-700">
                            <BarChart3 className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                          {detailStats.averageGrade.toFixed(1)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-green-50/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-emerald-700">Đã chấm</div>
                          <div className="h-9 w-9 rounded-xl bg-white/80 border border-emerald-100 flex items-center justify-center text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                          {detailStats.totalGraded}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-orange-50/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-amber-800">Chờ chấm</div>
                          <div className="h-9 w-9 rounded-xl bg-white/80 border border-amber-100 flex items-center justify-center text-amber-700">
                            <Clock className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                          {detailStats.totalPending}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-semibold text-slate-700">Tổng</div>
                          <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                            <NotebookText className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                          {detailStats.totalSubmissions}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="max-h-[62vh] overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 sm:px-5 sm:py-4 text-left font-semibold text-slate-900">Bài tập</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4 text-left font-semibold text-slate-900">Hạn</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4 text-left font-semibold text-slate-900">Trạng thái</th>
                            <th className="px-4 py-3 sm:px-5 sm:py-4 text-right font-semibold text-slate-900">Điểm</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailRows.length === 0 ? (
                            <tr>
                              <td className="px-4 py-10 sm:px-5" colSpan={4}>
                                <div className="flex flex-col items-center justify-center text-center">
                                  <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                                    <FileX2 className="h-5 w-5" />
                                  </div>
                                  <div className="mt-3 text-sm font-semibold text-slate-900">Chưa có dữ liệu điểm</div>
                                  <div className="mt-1 text-sm text-slate-600">Học sinh chưa có bài nộp hoặc chưa phát sinh điểm.</div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            detailRows.map((r) => (
                              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 sm:px-5 sm:py-4 align-top">
                                  <div className="font-semibold text-slate-900 leading-snug line-clamp-2">{r.assignmentTitle}</div>
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-[11px]">
                                      {r.assignmentType}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-3 sm:px-5 sm:py-4 align-top text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <span className="font-medium">{formatDate(r.dueDate)}</span>
                                  </div>
                                  {r.submittedAt ? (
                                    <div className="mt-1 text-xs text-slate-500">Nộp: {formatDate(r.submittedAt)}</div>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 sm:px-5 sm:py-4 align-top">
                                  {r.status === "graded" ? (
                                    <Badge variant="success">Đã chấm</Badge>
                                  ) : r.status === "submitted" ? (
                                    <Badge variant="warning">Chờ chấm</Badge>
                                  ) : (
                                    <Badge variant="outline">Chưa nộp</Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 sm:px-5 sm:py-4 align-top text-right">
                                  <span className="inline-flex min-w-[64px] justify-end font-bold tabular-nums text-slate-900">
                                    {r.grade !== null ? r.grade.toFixed(1) : "—"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
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
    </Tabs>
  );
}
