"use client";

import { useParams } from "next/navigation";
import AnnouncementsFeed from "@/components/newsfeed/AnnouncementsFeed";

/**
 * Component tổng quan lớp học cho học sinh
 * Hiển thị danh sách announcements với recent comments
 */
export default function StudentClassroomOverview() {
    const params = useParams();
    const classId = params.classId as string;

    return (
        <section className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Bảng tin lớp</h2>
            </div>
            <div className="bg-white/90 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-5 sm:p-6">
                {classId && (
                    <AnnouncementsFeed
                        classroomId={classId}
                        role="student"
                        pageSize={10}
                    />
                )}
            </div>
        </section>
    );
}

