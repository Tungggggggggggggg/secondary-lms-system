"use client";

import { useParams } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import AnnouncementDetail from "@/components/newsfeed/AnnouncementDetail";
import { studentClassPath } from "@/utils/routing";

/**
 * Trang chi tiết thông báo cho học sinh
 */
export default function StudentAnnouncementDetailPage() {
    const params = useParams();
    const classId = params.classId as string;
    const announcementId = params.announcementId as string;

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/student/dashboard" },
        { label: "Lớp học", href: "/dashboard/student/classes" },
        { label: "Thông báo", href: `${studentClassPath(classId)}` },
        { label: "Chi tiết", href: `#` },
    ];

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <BackButton href={studentClassPath(classId)} />
            </div>

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

