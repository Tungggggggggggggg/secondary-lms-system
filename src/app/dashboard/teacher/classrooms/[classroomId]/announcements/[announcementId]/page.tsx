"use client";

import { useParams } from "next/navigation";
import AnnouncementDetail from "@/components/classroom/newsfeed/AnnouncementDetail";

/**
 * Trang chi tiết thông báo cho giáo viên
 */
export default function TeacherAnnouncementDetailPage() {
    const params = useParams();
    const classroomId = params.classroomId as string;
    const announcementId = params.announcementId as string;

    return (
        <div className="max-w-5xl mx-auto">
            {classroomId && announcementId && (
                <AnnouncementDetail
                    announcementId={announcementId}
                    classroomId={classroomId}
                    role="teacher"
                />
            )}
        </div>
    );
}

