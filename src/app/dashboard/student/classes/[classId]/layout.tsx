import StudentClassroomTabs from "@/components/student/classroom/StudentClassroomTabs";
import StudentClassroomHeader from "@/components/student/classroom/StudentClassroomHeader";
import Breadcrumb, { BreadcrumbItem } from "@/components/ui/breadcrumb";
import BackButton from "@/components/ui/back-button";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Props = {
    children: React.ReactNode;
    params: { classId: string };
};

export default async function StudentClassroomLayout({ children, params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "STUDENT") {
        notFound();
    }

    const { classId } = params;

    // Fetch classroom details directly from database (server-side)
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
    });

    if (!user || user.role !== "STUDENT") {
        notFound();
    }

    // Check if student is a member of this classroom
    const isMember = await prisma.classroomStudent.findFirst({
        where: {
            classroomId: classId,
            studentId: user.id,
        },
    });

    if (!isMember) {
        notFound();
    }

    // Fetch classroom with teacher info
    const classroom = await prisma.classroom.findUnique({
        where: { id: classId },
        include: {
            teacher: { select: { id: true, fullname: true, email: true } },
            _count: { select: { students: true } },
        },
    });

    if (!classroom) {
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
        { label: "Dashboard", href: "/dashboard/student/dashboard" },
        { label: "Lớp học", href: "/dashboard/student/classes" },
        { label: classroom.name, href: `/dashboard/student/classes/${classId}` },
    ];

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex items-center justify-between">
                <Breadcrumb items={breadcrumbItems} />
                <BackButton href="/dashboard/student/classes" />
            </div>
            <StudentClassroomHeader classroom={classroomData} />
            <StudentClassroomTabs classId={classId} />
            <div className="mt-6">{children}</div>
        </div>
    );
}

