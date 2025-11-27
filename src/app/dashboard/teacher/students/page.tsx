"use client";

import { useEffect, useMemo, useState } from "react";
import StudentList, { StudentListItem } from "@/components/teacher/students/StudentList";
import StudentStats from "@/components/teacher/students/StudentStats";
import { useClassroom } from "@/hooks/use-classroom";
import type { ClassroomStudent } from "@/hooks/use-classroom-students";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/shared/EmptyState";

export default function StudentsPage() {
  const { classrooms, fetchClassrooms, isLoading: loadingClassrooms, error: classroomError } =
    useClassroom();

  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("name");
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Quản lý học sinh</h1>
          <p className="text-gray-600">Theo dõi và hỗ trợ học sinh của bạn</p>
        </div>
        <div className="flex items-center gap-3">
         
        </div>
      </div>

      {/* Stats Overview */}
      <StudentStats
        totalStudents={overview.totalStudents}
        avgParticipation={overview.avgParticipation}
        needSupportCount={overview.needSupportCount}
        avgGrade={overview.avgGrade}
      />

      {/* Filter & Search */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="all">Tất cả lớp</option>
            {(classrooms || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động tốt</option>
            <option value="warning">Cần chú ý</option>
            <option value="inactive">Không hoạt động</option>
          </Select>
          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
          >
            <option value="name">Sắp xếp theo tên</option>
            <option value="grade">Sắp xếp theo điểm</option>
            <option value="attendance">Sắp xếp theo chuyên cần</option>
          </Select>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder="Tìm kiếm học sinh..."
            className="pl-10 pr-4 py-2 bg-white rounded-xl border border-gray-200 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-2.5">🔍</span>
        </div>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="text-sm text-gray-500">Đang tải danh sách học sinh...</div>
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
          Đã xảy ra lỗi: {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title="Chưa có học sinh nào để hiển thị"
          description="Hãy kiểm tra bộ lọc hoặc thêm học sinh vào lớp học của bạn."
        />
      ) : (
        <StudentList students={filteredStudents} />
      )}
    </div>
  );
}
