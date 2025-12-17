import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'

/**
 * GET /api/teachers/assignments/stats
 * Lấy thống kê tổng hợp về assignments và classrooms của teacher - TỐI ƯU PERFORMANCE
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return errorResponse(401, 'Unauthorized')
    }
    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Teacher only')
    }

    const teacherId = authUser.id

    const now = new Date()

    // ✅ TỐI ƯU: Sử dụng single raw query cho tất cả stats
    const statsResult = await prisma.$queryRaw<Array<{
      total_assignments: bigint,
      total_classrooms: bigint, 
      total_students: bigint,
      total_submissions: bigint,
      assignments_with_submissions: bigint,
      graded_submissions: bigint,
      avg_grade: number | null
    }>>`
      SELECT 
        (SELECT COUNT(*) FROM "assignments" WHERE "authorId" = ${teacherId}) as total_assignments,
        (SELECT COUNT(*) FROM "classrooms" WHERE "teacherId" = ${teacherId} AND "isActive" = true) as total_classrooms,
        (SELECT COUNT(*) FROM "classroom_students" cs 
         JOIN "classrooms" c ON c."id" = cs."classroomId" 
         WHERE c."teacherId" = ${teacherId} AND c."isActive" = true) as total_students,
        (SELECT COUNT(*) FROM "assignment_submissions" asub 
         JOIN "assignments" a ON a."id" = asub."assignmentId" 
         WHERE a."authorId" = ${teacherId}) as total_submissions,
        (SELECT COUNT(DISTINCT a."id") FROM "assignments" a 
         JOIN "assignment_submissions" asub ON asub."assignmentId" = a."id"
         WHERE a."authorId" = ${teacherId}) as assignments_with_submissions,
        (SELECT COUNT(*) FROM "assignment_submissions" asub 
         JOIN "assignments" a ON a."id" = asub."assignmentId" 
         WHERE a."authorId" = ${teacherId} AND asub."grade" IS NOT NULL) as graded_submissions,
        (SELECT AVG(asub."grade") FROM "assignment_submissions" asub 
         JOIN "assignments" a ON a."id" = asub."assignmentId" 
         WHERE a."authorId" = ${teacherId} AND asub."grade" IS NOT NULL) as avg_grade
    `

    const rawStats = statsResult[0]

    // Convert BigInt to Number cho JSON serialization
    const totalAssignments = Number(rawStats.total_assignments)
    const totalClassrooms = Number(rawStats.total_classrooms)
    const totalStudents = Number(rawStats.total_students)
    const totalSubmissions = Number(rawStats.total_submissions)
    const assignmentsWithSubmissions = Number(rawStats.assignments_with_submissions)
    const gradedSubmissions = Number(rawStats.graded_submissions)
    // Align averageGrade theo rule P2: latest graded + overdue missing (0), deadline hiệu lực = lockAt ?? dueDate
    const avgAggRows = await prisma.$queryRaw<
      Array<{ grade_sum: number; grade_count: bigint; missing_overdue: bigint }>
    >`
      WITH class_students AS (
        SELECT cs."studentId" as student_id, cs."classroomId" as classroom_id
        FROM "classroom_students" cs
        JOIN "classrooms" c ON c."id" = cs."classroomId"
        WHERE c."teacherId" = ${teacherId} AND c."isActive" = true
      ),
      class_assignments AS (
        SELECT ac."assignmentId" as assignment_id, ac."classroomId" as classroom_id
        FROM "assignment_classrooms" ac
        JOIN "classrooms" c ON c."id" = ac."classroomId"
        WHERE c."teacherId" = ${teacherId} AND c."isActive" = true
      ),
      pairs AS (
        SELECT DISTINCT cs.student_id, ca.assignment_id
        FROM class_students cs
        JOIN class_assignments ca ON ca.classroom_id = cs.classroom_id
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
      missing_overdue AS (
        SELECT COUNT(*)::bigint as total
        FROM pairs p
        JOIN "assignments" a ON a."id" = p.assignment_id
        WHERE COALESCE(a."lockAt", a."dueDate") IS NOT NULL
          AND COALESCE(a."lockAt", a."dueDate") < ${now}
          AND NOT EXISTS (
            SELECT 1
            FROM "assignment_submissions" s
            WHERE s."studentId" = p.student_id AND s."assignmentId" = p.assignment_id
          )
      )
      SELECT
        COALESCE(SUM(lg.grade), 0)::double precision as grade_sum,
        COUNT(lg.assignment_id)::bigint as grade_count,
        (SELECT total FROM missing_overdue) as missing_overdue
      FROM (SELECT 1) dummy
      LEFT JOIN latest_graded lg ON true;
    `

    const gradeSum = Number(avgAggRows[0]?.grade_sum ?? 0)
    const gradeCount = Number(avgAggRows[0]?.grade_count ?? 0)
    const missingOverdue = Number(avgAggRows[0]?.missing_overdue ?? 0)
    const denom = gradeCount + missingOverdue
    const averageGrade = denom > 0 ? gradeSum / denom : null

    // Tính số assignments được assign vào classrooms
    const assignmentsInClassrooms = await prisma.assignmentClassroom.count({
      where: {
        assignment: {
          authorId: teacherId,
        },
      },
    });

    // Tính tỷ lệ nộp bài
    const expectedSubmissions = totalStudents * assignmentsInClassrooms;
    const submitRate = expectedSubmissions > 0 
      ? Math.round((totalSubmissions / expectedSubmissions) * 100)
      : 0;

    // Số assignments cần chấm (có submissions nhưng chưa chấm hết)
    const needGrading = totalSubmissions - gradedSubmissions;

    const finalStats = {
      totalAssignments,
      totalClassrooms,
      totalStudents,
      totalSubmissions,
      assignmentsWithSubmissions,
      needGrading: Math.max(needGrading, 0),
      submitRate: Math.min(submitRate, 100), // Cap at 100%
      averageGrade: averageGrade 
        ? Math.round(averageGrade * 10) / 10 
        : null,
      gradedSubmissions,
      assignmentsInClassrooms,
      expectedSubmissions
    };

    return NextResponse.json({ 
      success: true, 
      data: finalStats 
    }, { status: 200 });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/assignments/stats', error)
    return errorResponse(500, 'Internal server error')
  }
}
