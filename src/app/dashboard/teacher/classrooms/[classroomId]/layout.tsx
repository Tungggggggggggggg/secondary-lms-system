import ClassroomTabs from "@/components/teacher/classrooms/shared/ClassroomTabs";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Props = {
    children: React.ReactNode;
    params: { classroomId: string };
};

export default async function ClassroomLayout({ children, params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "TEACHER") {
        notFound();
    }

    const { classroomId } = params;

    // Fetch classroom details directly from database (server-side)
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
    });

    if (!user || user.role !== "TEACHER") {
        notFound();
    }

    // Fetch classroom with teacher info
    const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        include: {
            teacher: { select: { id: true, fullname: true, email: true } },
            _count: { select: { students: true } },
        },
    });

    if (!classroom) {
        notFound();
    }

    // Check if teacher owns this classroom
    if (classroom.teacherId !== user.id) {
        notFound();
    }

    // Transform to match ClassroomResponse type
    const classroomData = {
        ...classroom,
        teacher: classroom.teacher,
        _count: classroom._count,
    };

    // Breadcrumb items cho classroom detail pages
    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard/teacher/dashboard" },
        { label: "Lớp học", href: "/dashboard/teacher/classrooms" },
        { label: classroom.name, href: `/dashboard/teacher/classrooms/${classroomId}` },
    ];

    return (
        <div className="px-6 py-4 overflow-x-hidden">
            <div className="mb-4 flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <a
                    href="/dashboard/teacher/classrooms"
                    className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all border-2 border-blue-500 text-blue-600 hover:bg-blue-50 h-10 px-4 py-2"
                >
                    ← Quay lại
                </a>
            </div>
            <PageHeader
                role="teacher"
                title={classroom.name}
                subtitle={`GV: ${classroom.teacher?.fullname ?? "Giáo viên"} • Mã lớp: ${classroom.code}`}
            />
            <ClassroomTabs classroomId={classroomId} />
            <div className="mt-6">{children}</div>
        </div>
    );
}
