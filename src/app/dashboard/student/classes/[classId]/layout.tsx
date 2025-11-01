import StudentClassroomTabs from "@/components/student/classroom/StudentClassroomTabs";
import StudentClassroomHeader from "@/components/student/classroom/StudentClassroomHeader";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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

    if (!user || user.role !== UserRole.STUDENT) {
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

    return (
        <div className="px-6 py-4">
            <StudentClassroomHeader classroom={classroomData} />
            <StudentClassroomTabs classId={classId} />
            <div className="mt-6">{children}</div>
        </div>
    );
}

