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
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Bảng tin lớp</h2>
            {classId && (
                <AnnouncementsFeed
                    classroomId={classId}
                    role="student"
                    pageSize={10}
                />
            )}
        </div>
    );
}

