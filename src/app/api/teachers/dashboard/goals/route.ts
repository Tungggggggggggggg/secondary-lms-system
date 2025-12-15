import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

type TeacherGoalCategory = 'GRADING' | 'LESSON' | 'COMMUNICATION';

type TeacherGoal = {
  id: string;
  title: string;
  completed: number;
  total: number;
  category: TeacherGoalCategory;
};

/**
 * API: GET /api/teachers/dashboard/goals
 * Mục đích: Lấy mục tiêu tuần của teacher
 * - Chấm bài tập
 * - Tạo bài giảng mới
 * - Phản hồi phụ huynh (qua comments)
 * - Streak (số ngày hoạt động liên tục)
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

    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const endOfWeek = getEndOfWeek(now);

    const goals: TeacherGoal[] = [];

    // 1. Mục tiêu chấm bài tập
    // Tổng số submissions trong tuần này
    const totalSubmissionsThisWeek = await prisma.assignmentSubmission.count({
      where: {
        assignment: {
          authorId: userId,
        },
        submittedAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    // Số submissions đã chấm trong tuần này
    const gradedSubmissionsThisWeek = await prisma.assignmentSubmission.count({
      where: {
        assignment: {
          authorId: userId,
        },
        submittedAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
        grade: {
          not: null,
        },
      },
    });

    goals.push({
      id: 'grading',
      title: 'Chấm bài tập',
      completed: gradedSubmissionsThisWeek,
      total: Math.max(totalSubmissionsThisWeek, gradedSubmissionsThisWeek + 5), // Ít nhất 5 bài chưa chấm
      category: 'GRADING',
    });

    // 2. Mục tiêu tạo bài giảng mới
    const lessonsCreatedThisWeek = await prisma.lesson.count({
      where: {
        course: {
          authorId: userId,
        },
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    goals.push({
      id: 'lesson',
      title: 'Tạo bài giảng mới',
      completed: lessonsCreatedThisWeek,
      total: 5, // Mục tiêu 5 bài giảng/tuần
      category: 'LESSON',
    });

    // 3. Mục tiêu phản hồi (comments trong announcements)
    const commentsThisWeek = await prisma.announcementComment.count({
      where: {
        authorId: userId,
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    // Tổng số comments cần phản hồi (từ phụ huynh và học sinh)
    const totalCommentsToReply = await prisma.announcementComment.count({
      where: {
        announcement: {
          classroom: {
            teacherId: userId,
          },
        },
        author: {
          role: {
            in: ['PARENT', 'STUDENT'],
          },
        },
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    goals.push({
      id: 'communication',
      title: 'Phản hồi phụ huynh',
      completed: commentsThisWeek,
      total: Math.max(totalCommentsToReply, 15), // Ít nhất 15 phản hồi/tuần
      category: 'COMMUNICATION',
    });

    // 4. Tính streak (số ngày hoạt động liên tục)
    // Lấy các ngày có hoạt động (tạo lesson, comment, chấm bài)
    const recentActivities = await prisma.$queryRaw<Array<{ activity_date: Date }>>`
      SELECT DISTINCT DATE("createdAt") as activity_date
      FROM (
        SELECT "createdAt" FROM "lessons" WHERE "courseId" IN (
          SELECT "id" FROM "courses" WHERE "authorId" = ${userId}
        )
        UNION ALL
        SELECT "createdAt" FROM "announcement_comments" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "submittedAt" as "createdAt" FROM "assignment_submissions" 
        WHERE "assignmentId" IN (
          SELECT "id" FROM "assignments" WHERE "authorId" = ${userId}
        ) AND "grade" IS NOT NULL
      ) activities
      ORDER BY activity_date DESC
      LIMIT 30
    `;

    const streak = calculateStreak(
      recentActivities.map((a: { activity_date: Date }) => new Date(a.activity_date)),
    );

    return NextResponse.json({
      success: true,
      data: {
        goals,
        streak,
      },
    });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/dashboard/goals', error);
    return errorResponse(500, 'Internal server error');
  }
}

/**
 * Helper function: Lấy ngày đầu tuần (Thứ 2)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh khi Chủ nhật
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Helper function: Lấy ngày cuối tuần (Chủ nhật)
 */
function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Helper function: Tính streak (số ngày liên tục có hoạt động)
 */
function calculateStreak(activityDates: Date[]): number {
  if (activityDates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sắp xếp ngày giảm dần
  const sortedDates = activityDates
    .map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Kiểm tra xem có hoạt động hôm nay hoặc hôm qua không
  const latestDate = sortedDates[0];
  const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 1) return 0; // Streak bị gián đoạn

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const prevDate = sortedDates[i - 1];
    const diff = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      streak++;
    } else if (diff > 1) {
      break; // Streak bị gián đoạn
    }
    // diff === 0 nghĩa là cùng ngày, không tăng streak
  }

  return streak;
}
