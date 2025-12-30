import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { withPerformanceTracking } from '@/lib/performance-monitor';

/**
 * API: GET /api/teachers/dashboard/stats
 * Mục đích: Lấy thống kê tổng quan cho teacher dashboard
 * - Tổng số học sinh trong tất cả các lớp
 * - Tổng số lớp học
 * - Tổng số bài giảng (lessons)
 * - Số bài tập chờ chấm
 * - Thay đổi so với kỳ trước
 */
export async function GET(req: NextRequest) {
  return withPerformanceTracking('/api/teachers/dashboard/stats', 'GET', async () => {
    try {
      const authUser = await getAuthenticatedUser(req);
      if (!authUser) {
        return errorResponse(401, 'Unauthorized');
      }
      if (authUser.role !== 'TEACHER') {
        return errorResponse(403, 'Forbidden - Only teachers can access this endpoint');
      }

      const userId = authUser.id;

      // Lấy thời gian hiện tại và thời gian 1 tháng trước
      const now = new Date();
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const rows = await prisma.$queryRaw<
        Array<{
          totalClassrooms: number;
          newClassroomsThisWeek: number;
          totalStudents: number;
          newStudentsThisMonth: number;
          totalLessons: number;
          newLessonsThisMonth: number;
          pendingSubmissions: number;
        }>
      >`
        SELECT
          (SELECT COUNT(*)::int
            FROM "classrooms" c
            WHERE c."teacherId" = ${userId} AND c."isActive" = true
          ) as "totalClassrooms",
          (SELECT COUNT(*)::int
            FROM "classrooms" c
            WHERE c."teacherId" = ${userId} AND c."createdAt" >= ${oneWeekAgo}
          ) as "newClassroomsThisWeek",
          (SELECT COUNT(DISTINCT cs."studentId")::int
            FROM "classroom_students" cs
            JOIN "classrooms" c ON c."id" = cs."classroomId"
            WHERE c."teacherId" = ${userId} AND c."isActive" = true
          ) as "totalStudents",
          (SELECT COUNT(*)::int
            FROM "classroom_students" cs
            JOIN "classrooms" c ON c."id" = cs."classroomId"
            WHERE c."teacherId" = ${userId} AND c."isActive" = true AND cs."joinedAt" >= ${oneMonthAgo}
          ) as "newStudentsThisMonth",
          (SELECT COUNT(*)::int
            FROM "lessons" l
            JOIN "courses" co ON co."id" = l."courseId"
            WHERE co."authorId" = ${userId}
          ) as "totalLessons",
          (SELECT COUNT(*)::int
            FROM "lessons" l
            JOIN "courses" co ON co."id" = l."courseId"
            WHERE co."authorId" = ${userId} AND l."createdAt" >= ${oneMonthAgo}
          ) as "newLessonsThisMonth",
          (SELECT COUNT(*)::int
            FROM "assignment_submissions" s
            JOIN "assignments" a ON a."id" = s."assignmentId"
            WHERE a."authorId" = ${userId} AND s."grade" IS NULL
          ) as "pendingSubmissions";
      `;

      const row = rows[0] ?? {
        totalClassrooms: 0,
        newClassroomsThisWeek: 0,
        totalStudents: 0,
        newStudentsThisMonth: 0,
        totalLessons: 0,
        newLessonsThisMonth: 0,
        pendingSubmissions: 0,
      };

      const totalStudents = row.totalStudents;

      // 5. Tính phần trăm thay đổi học sinh
      const studentsLastMonth = totalStudents - row.newStudentsThisMonth;
      const studentsChange = studentsLastMonth > 0
        ? Math.round((row.newStudentsThisMonth / studentsLastMonth) * 100)
        : 0;

      // Tạo response data
      const stats = {
        totalStudents,
        totalClassrooms: row.totalClassrooms,
        totalLessons: row.totalLessons,
        pendingSubmissions: row.pendingSubmissions,
        studentsChange,
        classroomsChange: row.newClassroomsThisWeek,
        lessonsChange: row.newLessonsThisMonth,
      };

      return NextResponse.json({
        success: true,
        data: stats,
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=50',
        },
      });

    } catch (error) {
      console.error('[ERROR] [GET] /api/teachers/dashboard/stats', error);
      return errorResponse(500, 'Internal server error');
    }
  })();
}
