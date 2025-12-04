"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AnnouncementsFeed from "@/components/newsfeed/AnnouncementsFeed";
import SectionHeader from "@/components/shared/SectionHeader";
import StatsGrid, { type StatItem } from "@/components/shared/StatsGrid";
import StudentAssignmentListItem from "@/components/student/assignments/StudentAssignmentListItem";
import SkeletonList from "@/components/shared/SkeletonList";
import EmptyState from "@/components/shared/EmptyState";
import { useStudentAssignments } from "@/hooks/use-student-assignments";
import { CalendarClock, ClipboardList, CheckCheck, AlertTriangle } from "lucide-react";

/**
 * Tổng quan lớp học (Student)
 * - StatsGrid: tổng bài tập, đã nộp, quá hạn, sắp tới hạn
 * - QuickActions: Bài tập, Điểm số, Tin nhắn
 * - Upcoming assignments
 * - Announcements feed
 */
export default function StudentClassroomOverview() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const { assignments, isLoading, error, fetchClassroomAssignments } = useStudentAssignments();

  useEffect(() => {
    if (classId) {
      void fetchClassroomAssignments(classId);
    }
  }, [classId, fetchClassroomAssignments]);

  const now = new Date();
  const upcoming = useMemo(() =>
    (assignments || [])
      .filter(a => !!a.dueDate && new Date(a.dueDate!) > now && !a.submission)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  , [assignments, now]);

  const dueSoon7 = useMemo(() =>
    (assignments || [])
      .filter(a => {
        if (!a.dueDate) return false;
        const d = new Date(a.dueDate);
        const in7 = new Date(now.getTime() + 7*24*60*60*1000);
        return d > now && d <= in7 && !a.submission;
      }).length
  , [assignments, now]);

  const total = assignments.length;
  const submitted = assignments.filter(a => !!a.submission).length;
  const overdue = assignments.filter(a => a.status === "overdue").length;

  const stats: StatItem[] = [
    {
      icon: <ClipboardList className="h-6 w-6 text-green-600" />, color: "from-green-200 to-emerald-100",
      label: "Tổng bài tập", value: String(total), subtitle: "Trong lớp này",
    },
    {
      icon: <CheckCheck className="h-6 w-6 text-emerald-600" />, color: "from-emerald-200 to-green-100",
      label: "Đã nộp", value: String(submitted), pillText: submitted > 0 ? "✓" : undefined,
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-rose-600" />, color: "from-rose-200 to-orange-100",
      label: "Quá hạn", value: String(overdue), subtitle: overdue > 0 ? "Cần xử lý sớm" : "Không có",
    },
    {
      icon: <CalendarClock className="h-6 w-6 text-green-700" />, color: "from-green-100 to-emerald-100",
      label: "Sắp tới hạn (7 ngày)", value: String(dueSoon7),
    },
  ];

  return (
    <section className="space-y-6">
      {/* Stats */}
      <StatsGrid
        items={stats}
        onItemClick={(_, idx) => {
          // Điều hướng nhanh dựa trên item được click
          if (idx === 0) router.push(`/dashboard/student/classes/${classId}/assignments`);
          if (idx === 1) router.push(`/dashboard/student/classes/${classId}/assignments?filter=submitted`);
          if (idx === 2) router.push(`/dashboard/student/classes/${classId}/assignments?filter=overdue`);
          if (idx === 3) router.push(`/dashboard/student/classes/${classId}/assignments?filter=dueSoon`);
        }}
      />

      {/* Upcoming assignments */}
      <div>
        <SectionHeader
          title={<span className="text-green-700 flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Sắp tới hạn</span>}
        />
        {isLoading ? (
          <SkeletonList rows={3} />
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
            {error}
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map(a => (
              <StudentAssignmentListItem
                key={a.id}
                item={{ id: a.id, title: a.title, type: a.type, dueDate: a.dueDate || null, status: a.status }}
                href={`/dashboard/student/assignments/${a.id}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Chưa có bài sắp tới hạn"
            description="Bạn đang rảnh! Kiểm tra lại bảng tin để cập nhật thông báo mới."
          />
        )}
      </div>

      {/* Announcements */}
      <div className="bg-white/90 rounded-2xl border border-green-100 shadow-sm p-4 sm:p-6">
        <SectionHeader
          title={<span className="text-green-700">Bảng tin lớp</span>}
          className="mb-4"
        />
        {classId && (
          <AnnouncementsFeed classroomId={classId} role="student" pageSize={10} />
        )}
      </div>
    </section>
  );
}

