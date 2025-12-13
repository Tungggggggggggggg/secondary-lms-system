import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/assignments/[id]/classrooms
 * Lấy danh sách lớp học đang có assignment này
 * Dùng cho hiển thị classroom badges trên AssignmentCard
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    // Lấy thông tin user hiện tại
    const user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Teacher only' 
      }, { status: 403 })
    }

    // Validate assignment ID và quyền sở hữu
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, title: true }
    });

    if (!assignment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assignment not found' 
      }, { status: 404 })
    }

    if (assignment.authorId !== user.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Not your assignment' 
      }, { status: 403 })
    }

    // Lấy danh sách classrooms có assignment này
    const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
      where: {
        assignmentId: params.id
      },
      select: {
        addedAt: true,
        classroom: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            _count: { select: { students: true } },
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    interface AssignmentClassroomRow {
      addedAt: Date | string;
      classroom: {
        id: string;
        name: string;
        code: string;
        icon: string | null;
        _count: {
          students: number;
        };
      };
    }

    // Lấy danh sách classroom IDs
    const classroomIds = assignmentClassrooms.map(
      (ac: AssignmentClassroomRow) => ac.classroom.id
    );

    // Đếm số học sinh đã nộp theo từng classroom (1 query aggregate)
    const submissionCounts = classroomIds.length
      ? await prisma.$queryRaw<Array<{ classroomId: string; cnt: bigint }>>`
          SELECT cs."classroomId" as "classroomId", COUNT(DISTINCT s."studentId")::bigint as cnt
          FROM "classroom_students" cs
          JOIN "assignment_submissions" s
            ON s."studentId" = cs."studentId" AND s."assignmentId" = ${params.id}
          WHERE cs."classroomId" = ANY(${classroomIds}::text[])
          GROUP BY cs."classroomId";
        `
      : [];

    const submissionCountByClassroomId = new Map<string, number>(
      submissionCounts.map((r: { classroomId: string; cnt: bigint }) => [r.classroomId, Number(r.cnt)])
    );

    interface AssignmentClassroomSummary {
      classroomId: string;
      classroomName: string;
      classroomCode: string;
      classroomIcon: string | null;
      studentCount: number;
      submissionCount: number;
      assignedAt: Date | string;
      color: string;
    }

    // Transform data để phù hợp với frontend
    const transformedData: AssignmentClassroomSummary[] = assignmentClassrooms.map(
      (ac: AssignmentClassroomRow) => {
        const classroomId = ac.classroom.id;
        const totalStudents = ac.classroom._count.students;
        const submissionCount = submissionCountByClassroomId.get(classroomId) || 0;

        return {
          classroomId: ac.classroom.id,
          classroomName: ac.classroom.name,
          classroomCode: ac.classroom.code,
          classroomIcon: ac.classroom.icon,
          studentCount: totalStudents,
          submissionCount: submissionCount,
          assignedAt: ac.addedAt,
          // Màu sắc cố định cho mỗi classroom (dựa trên ID)
          color: `#${ac.classroom.id
            .slice(0, 6)
            .split('')
            .map((c: string) => c.charCodeAt(0))
            .join('')
            .slice(0, 6)}`,
        };
      }
    );

    return NextResponse.json({ 
      success: true, 
      data: transformedData,
      summary: {
        totalClassrooms: transformedData.length,
        totalStudents: transformedData.reduce(
          (sum: number, cls: AssignmentClassroomSummary) =>
            sum + cls.studentCount,
          0
        ),
        totalSubmissions: transformedData.reduce(
          (sum: number, cls: AssignmentClassroomSummary) =>
            sum + cls.submissionCount,
          0
        ),
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[ASSIGNMENT CLASSROOMS GET] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
