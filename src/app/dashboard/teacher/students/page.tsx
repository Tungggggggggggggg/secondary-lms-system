"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Users } from "lucide-react";
import StudentList, { StudentListItem } from "@/components/teacher/students/StudentList";
import StudentStats from "@/components/teacher/students/StudentStats";
import StudentListSkeleton from "@/components/teacher/students/StudentListSkeleton";
import StudentFiltersToolbar, {
  type StudentSortKey,
  type StudentStatusFilter,
} from "@/components/teacher/students/StudentFiltersToolbar";
import { useClassroom } from "@/hooks/use-classroom";
import type { ClassroomStudent } from "@/hooks/use-classroom-students";
import EmptyState from "@/components/shared/EmptyState";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
export default function StudentsPage() {
  const { classrooms, fetchClassrooms, isLoading: loadingClassrooms, error: classroomError } =
    useClassroom();

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const [sortKey, setSortKey] = useState<StudentSortKey>("name");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  useEffect(() => {
    const load = async () => {
      if (!classrooms || classrooms.length === 0) {
        setStudents([]);
        return;
      }
      try {
        setLoadingStudents(true);
        setStudentError(null);
        const all: StudentListItem[] = [];

        for (const c of classrooms) {
          const res = await fetch(`/api/classrooms/${c.id}/students`);
          const json = await res.json();
          if (!res.ok || json?.success === false) {
            console.error("[StudentsPage] load students error", json?.message || res.statusText);
            continue;
          }
          const items = (json.data || []) as ClassroomStudent[];
          items.forEach((s) => {
            const totalAssignments = s.stats.totalAssignments;
            const submitted = s.stats.submittedCount;
            const submissionRate =
              totalAssignments > 0 ? (submitted / totalAssignments) * 100 : 0;
            let status: "active" | "warning" | "inactive" = "active";
            if (submissionRate < 50) status = "inactive";
            else if (submissionRate < 80) status = "warning";

            all.push({
              id: s.id,
              fullname: s.fullname,
              avatarInitial: s.fullname.charAt(0).toUpperCase(),
              classroomId: c.id,
              classroomName: c.name,
              classroomCode: c.code,
              averageGrade: s.stats.averageGrade,
              submissionRate,
              submittedCount: submitted,
              totalAssignments,
              status,
            });
          });
        }

        setStudents(all);
      } catch (e) {
        console.error("[StudentsPage] load students error", e);
        setStudentError(
          e instanceof Error ? e.message : "Có lỗi xảy ra khi tải danh sách học sinh"
        );
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    load();
  }, [classrooms]);

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
  const error = classroomError || studentError;

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

      {/* Stats Overview */}
      <StudentStats
        totalStudents={overview.totalStudents}
        avgParticipation={overview.avgParticipation}
        needSupportCount={overview.needSupportCount}
        avgGrade={overview.avgGrade}
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
      />

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
              onClick={() => fetchClassrooms()}
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
                fetchClassrooms();
              }}
              className="mt-2 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Làm mới dữ liệu
            </button>
          }
        />
      ) : (
        <StudentList students={filteredStudents} />
      )}
    </div>
  );
}
