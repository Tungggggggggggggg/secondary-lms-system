import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

interface TeacherPerformanceClassroomRow {
  id: string;
  name: string;
  icon: string | null;
  _count: {
    students: number;
  };
}

/**
 * API: GET /api/teachers/dashboard/performance
 * Mục đích: Lấy hiệu suất giảng dạy theo từng lớp học
 * - Điểm trung bình của lớp
 * - Tỷ lệ nộp bài
 * - Thông tin lớp học
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, 'Unauthorized');
    }
    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Only teachers can access this endpoint');
    }

    const userId = authUser.id;

    // Lấy tất cả các lớp học của teacher
    const classrooms = (await prisma.classroom.findMany({
      where: {
        teacherId: userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Lấy top 5 lớp mới nhất
    })) as TeacherPerformanceClassroomRow[];

    const classroomIds = classrooms.map((c) => c.id);
    const baseline = classrooms.map((classroom: TeacherPerformanceClassroomRow) => ({
      classroomId: classroom.id,
      classroomName: classroom.name,
      icon: classroom.icon,
      averageGrade: 0,
      totalStudents: classroom._count.students,
      submittedCount: 0,
      color: getColorForIcon(classroom.icon),
    }));

    if (classroomIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Tính average theo rule P2 (latest graded + overdue missing 0) và deadline hiệu lực = lockAt ?? dueDate
    const metricsRows = await prisma.$queryRaw<
      Array<{
        classroom_id: string;
        grade_sum: number;
        grade_count: bigint;
        missing_overdue: bigint;
        submitted_students: bigint;
      }>
    >`
      WITH target_classrooms AS (
        SELECT UNNEST(${classroomIds}::text[]) as classroom_id
      ),
      pairs AS (
        SELECT DISTINCT cs."classroomId" as classroom_id, cs."studentId" as student_id, ac."assignmentId" as assignment_id
        FROM "classroom_students" cs
        JOIN "assignment_classrooms" ac ON ac."classroomId" = cs."classroomId"
        JOIN target_classrooms tc ON tc.classroom_id = cs."classroomId"
      ),
      latest_graded AS (
        SELECT DISTINCT ON (s."studentId", s."assignmentId")
          s."studentId" as student_id,
          s."assignmentId" as assignment_id,
          s."grade" as grade
        FROM "assignment_submissions" s
        JOIN pairs p ON p.student_id = s."studentId" AND p.assignment_id = s."assignmentId"
        WHERE s."grade" IS NOT NULL
        ORDER BY s."studentId", s."assignmentId", s."attempt" DESC, s."submittedAt" DESC
      ),
      graded_by_classroom AS (
        SELECT p.classroom_id,
          COALESCE(SUM(lg.grade), 0)::double precision as grade_sum,
          COUNT(lg.assignment_id)::bigint as grade_count
        FROM pairs p
        JOIN latest_graded lg ON lg.student_id = p.student_id AND lg.assignment_id = p.assignment_id
        GROUP BY p.classroom_id
      ),
      missing_overdue AS (
        SELECT p.classroom_id,
          COUNT(*)::bigint as missing_overdue
        FROM pairs p
        JOIN "assignments" a ON a."id" = p.assignment_id
        WHERE COALESCE(a."lockAt", a."dueDate") IS NOT NULL
          AND COALESCE(a."lockAt", a."dueDate") < NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM "assignment_submissions" s
            WHERE s."studentId" = p.student_id AND s."assignmentId" = p.assignment_id
          )
        GROUP BY p.classroom_id
      ),
      submitted_students AS (
        SELECT p.classroom_id,
          COUNT(DISTINCT s."studentId")::bigint as submitted_students
        FROM "assignment_submissions" s
        JOIN pairs p ON p.student_id = s."studentId" AND p.assignment_id = s."assignmentId"
        GROUP BY p.classroom_id
      )
      SELECT
        tc.classroom_id,
        COALESCE(g.grade_sum, 0)::double precision as grade_sum,
        COALESCE(g.grade_count, 0)::bigint as grade_count,
        COALESCE(m.missing_overdue, 0)::bigint as missing_overdue,
        COALESCE(ss.submitted_students, 0)::bigint as submitted_students
      FROM target_classrooms tc
      LEFT JOIN graded_by_classroom g ON g.classroom_id = tc.classroom_id
      LEFT JOIN missing_overdue m ON m.classroom_id = tc.classroom_id
      LEFT JOIN submitted_students ss ON ss.classroom_id = tc.classroom_id;
    `;

    const metricsByClassroomId = new Map(
      metricsRows.map((r) => [
        r.classroom_id,
        {
          gradeSum: Number(r.grade_sum ?? 0),
          gradeCount: Number(r.grade_count ?? 0),
          missingOverdue: Number(r.missing_overdue ?? 0),
          submittedStudents: Number(r.submitted_students ?? 0),
        },
      ])
    );

    const performanceData = baseline.map((row) => {
      const m = metricsByClassroomId.get(row.classroomId);
      if (!m) return row;
      const denom = m.gradeCount + m.missingOverdue;
      const avg = denom > 0 ? m.gradeSum / denom : 0;
      return {
        ...row,
        averageGrade: Math.round(avg),
        submittedCount: m.submittedStudents,
      };
    });

    // Sắp xếp theo điểm trung bình giảm dần
    performanceData.sort((a, b) => b.averageGrade - a.averageGrade);

    return NextResponse.json({
      success: true,
      data: performanceData,
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=50',
      },
    });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/dashboard/performance', error);
    return errorResponse(500, 'Internal server error');
  }
}

/**
 * Helper function: Lấy màu gradient dựa trên icon
 */
function getColorForIcon(icon: string | null): string {
  if (!icon) return 'from-gray-400 to-gray-500';
  if (icon.includes('📜') || icon.includes('📚')) return 'from-yellow-400 to-yellow-500';
  if (icon.includes('🗺️')) return 'from-emerald-400 to-emerald-500';
  if (icon.includes('🗣️')) return 'from-blue-400 to-blue-500';
  if (icon.includes('🧮')) return 'from-purple-400 to-purple-500';
  if (icon.includes('🔬')) return 'from-green-400 to-green-500';
  if (icon.includes('🎨')) return 'from-pink-400 to-pink-500';
  return 'from-gray-400 to-gray-500';
}
