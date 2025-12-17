"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Users, BarChart3, Target, LayoutList, LayoutGrid } from "lucide-react";
import StudentList, { StudentListItem } from "@/components/teacher/students/StudentList";
import StudentListSkeleton from "@/components/teacher/students/StudentListSkeleton";
import StudentFiltersToolbar, {
  type StudentSortKey,
  type StudentStatusFilter,
} from "@/components/teacher/students/StudentFiltersToolbar";
import { useClassroom } from "@/hooks/use-classroom";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/shared";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { StatsGrid } from "@/components/shared";
import StudentsTable from "@/components/teacher/students/StudentsTable";
import { exportToXlsx } from "@/lib/excel";

type TeacherStudentsApiResponse = {
  success?: boolean;
  data?: StudentListItem[];
  message?: string;
};

async function fetchTeacherStudents(): Promise<StudentListItem[]> {
  const res = await fetch("/api/teachers/students", { cache: "no-store" });
  const payload = (await res.json()) as TeacherStudentsApiResponse;
  if (!res.ok || payload?.success === false) {
    const msg = payload?.message || res.statusText || "Không thể tải danh sách học sinh";
    throw new Error(msg);
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}

export default function StudentsPage() {
  const { classrooms, fetchClassrooms, isLoading: loadingClassrooms, error: classroomError } =
    useClassroom();

  const {
    data: studentsData,
    error: studentsError,
    isLoading: loadingStudents,
    mutate: refetchStudents,
  } = useSWR<StudentListItem[]>("/api/teachers/students", fetchTeacherStudents, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  });

  const students = useMemo(() => studentsData ?? [], [studentsData]);

  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [sortKey, setSortKey] = useState<StudentSortKey>("name");
  const [search, setSearch] = useState<string>("");

  const handleRefresh = async (): Promise<void> => {
    await Promise.all([fetchClassrooms(), refetchStudents()]);
  };

  const filteredStudents = useMemo(() => {
    let list = [...students];

    if (selectedClassId !== "all") {
      list = list.filter((s) => s.classroomId === selectedClassId);
    }

    if (statusFilter !== "all") {
      list = list.filter((s) => s.status === statusFilter);
    }

    const searchValue = search.trim().toLowerCase();
    if (searchValue) {
      list = list.filter((s) => {
        return (
          s.fullname.toLowerCase().includes(searchValue) ||
          s.classroomName.toLowerCase().includes(searchValue) ||
          s.classroomCode.toLowerCase().includes(searchValue)
        );
      });
    }

    list.sort((a, b) => {
      if (sortKey === "grade") {
        const ag = a.averageGrade ?? -1;
        const bg = b.averageGrade ?? -1;
        return bg - ag;
      }
      if (sortKey === "attendance") {
        return b.submissionRate - a.submissionRate;
      }
      return a.fullname.localeCompare(b.fullname, "vi");
    });

    return list;
  }, [students, selectedClassId, statusFilter, search, sortKey]);

  const isLoading = loadingClassrooms || loadingStudents;
  const error = classroomError || (studentsError ? String(studentsError) : null);

  const overview = useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        avgParticipation: 0,
        needSupportCount: 0,
        avgGrade: null as number | null,
      };
    }

    let totalSubmitted = 0;
    let totalAssignments = 0;
    let sumGrades = 0;
    let gradeCount = 0;
    let needSupportCount = 0;

    students.forEach((s) => {
      totalSubmitted += s.submittedCount;
      totalAssignments += s.totalAssignments;
      if (s.averageGrade !== null) {
        sumGrades += s.averageGrade;
        gradeCount += 1;
      }
      if (s.status !== "active") needSupportCount += 1;
    });

    const avgParticipation =
      totalAssignments > 0 ? (totalSubmitted / totalAssignments) * 100 : 0;
    const avgGrade = gradeCount > 0 ? sumGrades / gradeCount : null;

    return {
      totalStudents,
      avgParticipation,
      needSupportCount,
      avgGrade,
    };
  }, [students]);

  // View toggle
  const [view, setView] = useState<"list" | "table">(() => {
    if (typeof window === "undefined") return "table";
    return (window.localStorage.getItem("teacher:students:view") as "list" | "table") || "table";
  });
  useEffect(() => {
    try { window.localStorage.setItem("teacher:students:view", view); } catch {}
  }, [view]);

  // Export Excel theo bộ lọc hiện tại
  const onExportFiltered = () => {
    const header = [
      "id",
      "fullname",
      "classroomId",
      "classroomName",
      "classroomCode",
      "averageGrade",
      "submissionRate",
      "submittedCount",
      "totalAssignments",
      "status",
    ];
    const rows = filteredStudents.map((s) => [
      s.id,
      s.fullname,
      s.classroomId,
      s.classroomName,
      s.classroomCode,
      s.averageGrade ?? "",
      Math.round(s.submissionRate),
      s.submittedCount,
      s.totalAssignments,
      s.status,
    ]);
    exportToXlsx(`students-${rows.length}`, header, rows, { sheetName: "Students" });
  };
 const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
    { label: "Học sinh", href: "/dashboard/teacher/students" },
  ];
  return (
    <div className="p-8">
      {/* Header */}
      <Breadcrumb items={breadcrumbItems} color="blue" className="mb-2" />
      <PageHeader
        title="Quản lý học sinh"
        subtitle="Theo dõi và hỗ trợ học sinh trong các lớp của bạn"
        role="teacher"
        badge={
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <Users className="mr-1 h-3.5 w-3.5" />
            {overview.totalStudents} học sinh
          </span>
        }
      />

      {/* Stats Overview (StatsGrid) */}
      <StatsGrid
        items={[
          { icon: <Users className="h-5 w-5" />, color: "from-blue-300 to-indigo-200", label: "Tổng học sinh", value: overview.totalStudents.toString(), subtitle: "Tất cả học sinh trong các lớp của bạn" },
          { icon: <BarChart3 className="h-5 w-5" />, color: "from-green-300 to-emerald-200", label: "Tỷ lệ hoàn thành", value: `${Math.round(overview.avgParticipation)}%`, subtitle: "Trung bình chuyên cần toàn lớp" },
          { icon: <AlertTriangle className="h-5 w-5" />, color: "from-amber-300 to-orange-200", label: "Cần hỗ trợ", value: overview.needSupportCount.toString(), subtitle: "HS có chuyên cần thấp" },
          { icon: <Target className="h-5 w-5" />, color: "from-blue-200 to-indigo-100", label: "Điểm trung bình", value: overview.avgGrade !== null ? overview.avgGrade.toFixed(1) : "-", subtitle: "TB các học sinh có điểm" },
        ]}
        onItemClick={(_, idx) => {
          if (idx === 0) setStatusFilter("all");
          if (idx === 1) setSortKey("attendance");
          if (idx === 2) setStatusFilter("warning");
          if (idx === 3) setSortKey("grade");
        }}
      />

      {/* Filter & Search */}
      <StudentFiltersToolbar
        classrooms={(classrooms || []).map((classroom) => ({
          id: classroom.id,
          name: classroom.name,
          code: classroom.code,
        }))}
        selectedClassId={selectedClassId}
        onClassChange={(id) => setSelectedClassId(id)}
        status={statusFilter}
        onStatusChange={(status) => setStatusFilter(status)}
        sortKey={sortKey}
        onSortChange={(key) => setSortKey(key)}
        search={search}
        onSearchChange={(value) => setSearch(value)}
        onReset={() => {
          setSelectedClassId("all");
          setStatusFilter("all");
          setSortKey("name");
          setSearch("");
        }}
      />

      {/* Hành động chung */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-blue-700">Chế độ xem:</div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onExportFiltered}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            aria-label="Xuất Excel theo bộ lọc"
          >
            Xuất Excel
          </button>
          {/* View toggle */}
          <div className="inline-flex rounded-xl border border-blue-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
              aria-pressed={view === "list"}
            >
              <LayoutList className="h-4 w-4" /> Danh sách
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm border-l border-blue-200 ${view === "table" ? "bg-blue-600 text-white" : "bg-white text-blue-700 hover:bg-blue-50"}`}
              aria-pressed={view === "table"}
            >
              <LayoutGrid className="h-4 w-4" /> Bảng
            </button>
          </div>
        </div>
      </div>
      

      {/* Student List */}
      {isLoading ? (
        <StudentListSkeleton />
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10 text-red-500" />}
          title="Đã xảy ra lỗi khi tải danh sách học sinh"
          description={error}
          variant="teacher"
          action={
            <button
              type="button"
              onClick={() => {
                void handleRefresh();
              }}
              className="mt-2 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Thử lại
            </button>
          }
        />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 text-blue-500" />}
          title="Chưa có học sinh nào để hiển thị"
          description="Hãy kiểm tra bộ lọc hoặc thêm học sinh vào lớp học của bạn."
          variant="teacher"
          action={
            <button
              type="button"
              onClick={() => {
                // Điều hướng tới màn quản lý lớp nếu cần, tạm thời chỉ gọi lại fetch
                void handleRefresh();
              }}
              className="mt-2 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Làm mới dữ liệu
            </button>
          }
        />
      ) : (
        <>
          {view === "list" ? (
            <StudentList students={filteredStudents} />
          ) : (
            <StudentsTable students={filteredStudents} selectable={false} />
          )}
        </>
      )}
    </div>
  );
}
