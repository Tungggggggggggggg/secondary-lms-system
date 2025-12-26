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

      const [
        totalClassrooms,
        newClassroomsThisWeek,
        totalStudentsRows,
        newStudentsThisMonth,
        totalLessons,
        newLessonsThisMonth,
        pendingSubmissions,
      ] = await Promise.all([
        // 1. Đếm tổng số lớp học của teacher
        prisma.classroom.count({
          where: { teacherId: userId, isActive: true },
        }),

        // 2. Đếm số lớp mới trong tuần này
        prisma.classroom.count({
          where: { teacherId: userId, createdAt: { gte: oneWeekAgo } },
        }),

        // 3. Đếm tổng số học sinh (unique) trong tất cả các lớp của teacher
        prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(DISTINCT cs."studentId")::bigint as total
          FROM "classroom_students" cs
          JOIN "classrooms" c ON c."id" = cs."classroomId"
          WHERE c."teacherId" = ${userId} AND c."isActive" = true;
        `,

        // 4. Đếm số học sinh mới trong tháng này
        prisma.classroomStudent.count({
          where: {
            classroom: { teacherId: userId, isActive: true },
            joinedAt: { gte: oneMonthAgo },
          },
        }),

        // 6. Đếm tổng số bài giảng (lessons) trong các khóa học của teacher
        prisma.lesson.count({
          where: { course: { authorId: userId } },
        }),

        // 7. Đếm số bài giảng mới trong tháng này
        prisma.lesson.count({
          where: { course: { authorId: userId }, createdAt: { gte: oneMonthAgo } },
        }),

        // 8. Đếm số bài tập chờ chấm (submissions chưa có grade)
        prisma.assignmentSubmission.count({
          where: { assignment: { authorId: userId }, grade: null },
        }),
      ]);

      const totalStudents = Number(totalStudentsRows[0]?.total ?? 0);

      // 5. Tính phần trăm thay đổi học sinh
      const studentsLastMonth = totalStudents - newStudentsThisMonth;
      const studentsChange = studentsLastMonth > 0
        ? Math.round((newStudentsThisMonth / studentsLastMonth) * 100)
        : 0;

      // Tạo response data
      const stats = {
        totalStudents,
        totalClassrooms,
        totalLessons,
        pendingSubmissions,
        studentsChange,
        classroomsChange: newClassroomsThisWeek,
        lessonsChange: newLessonsThisMonth,
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
