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
    const averageGrade = rawStats.avg_grade

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
