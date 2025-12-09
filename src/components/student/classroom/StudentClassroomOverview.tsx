"use client";

import { useParams } from "next/navigation";
import AnnouncementsFeed from "@/components/classroom/newsfeed/AnnouncementsFeed";
import { SectionHeader } from "@/components/shared";

/**
 * Tổng quan lớp học (Student)
 * - StatsGrid: tổng bài tập, đã nộp, quá hạn, sắp tới hạn
 * - QuickActions: Bài tập, Điểm số, Tin nhắn
 * - Upcoming assignments
 * - Announcements feed
 */
export default function StudentClassroomOverview() {
  const params = useParams();
  const classId = params.classId as string;

  return (
    <section className="space-y-6">
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

