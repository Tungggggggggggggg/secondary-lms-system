import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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
  try {
    console.log('[API /api/teachers/dashboard/stats] Bắt đầu xử lý request...');

    // Xác thực người dùng
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[API /api/teachers/dashboard/stats] Không có session');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Kiểm tra role teacher
    if (userRole !== 'TEACHER') {
      console.error('[API /api/teachers/dashboard/stats] User không phải teacher');
      return NextResponse.json(
        { success: false, message: 'Forbidden - Only teachers can access this endpoint' },
        { status: 403 }
      );
    }

    console.log(`[API /api/teachers/dashboard/stats] Teacher ID: ${userId}`);

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

    console.log('[API /api/teachers/dashboard/stats] Thống kê:', stats);

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('[API /api/teachers/dashboard/stats] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
