"use client";

import { useParams } from "next/navigation";
import AnnouncementDetail from "@/components/classroom/newsfeed/AnnouncementDetail";

/**
 * Trang chi tiết thông báo cho học sinh
 */
export default function StudentAnnouncementDetailPage() {
    const params = useParams();
    const classId = params.classId as string;
    const announcementId = params.announcementId as string;

    return (
        <div className="mt-4">
            <div className="max-w-5xl mx-auto">
                {classId && announcementId && (
                    <AnnouncementDetail
                        announcementId={announcementId}
                        classroomId={classId}
                        role="student"
                    />
                )}
            </div>
        </div>
    );
}

