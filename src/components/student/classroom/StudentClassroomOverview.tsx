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
        <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-lg">
                        📢
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Bảng tin lớp
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Các thông báo mới nhất và hoạt động gần đây trong lớp học của bạn.
                        </p>
                    </div>
                </div>
            </div>
            <div className="bg-white/90 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-6">
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

