import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict()

function normalizeZodIssues(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
}

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
    const user = await getAuthenticatedUser(req)
    if (!user) return errorResponse(401, 'Unauthorized')
    if (user.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher only')

    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: normalizeZodIssues(parsedParams.error.issues),
      })
    }

    const assignmentId = parsedParams.data.id

    // Validate assignment ID và quyền sở hữu
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, authorId: true, title: true }
    });

    if (!assignment) {
      return errorResponse(404, 'Assignment not found')
    }

    if (assignment.authorId !== user.id) {
      return errorResponse(403, 'Forbidden - Not your assignment')
    }

    // Lấy danh sách classrooms có assignment này
    const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
      where: {
        assignmentId
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
            ON s."studentId" = cs."studentId" AND s."assignmentId" = ${assignmentId}
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

  } catch (error: unknown) {
    console.error('[ASSIGNMENT CLASSROOMS GET] Error:', error);
    return errorResponse(500, 'Internal server error')
  }
}
