"use client";

import { useParams } from "next/navigation";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import AnnouncementDetail from "@/components/newsfeed/AnnouncementDetail";
import { teacherClassroomPath } from "@/utils/routing";

/**
 * Trang chi tiết thông báo cho giáo viên
 */
export default function TeacherAnnouncementDetailPage() {
    const params = useParams();
    const classroomId = params.classroomId as string;
    const announcementId = params.announcementId as string;

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
        { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
        { label: "Thông báo", href: `${teacherClassroomPath(classroomId)}` },
        { label: "Chi tiết", href: `#` },
    ];

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <BackButton href={teacherClassroomPath(classroomId)} />
            </div>

            <div className="max-w-5xl mx-auto">
                {classroomId && announcementId && (
                    <AnnouncementDetail
                        announcementId={announcementId}
                        classroomId={classroomId}
                        role="teacher"
                    />
                )}
            </div>
        </div>
    );
}

