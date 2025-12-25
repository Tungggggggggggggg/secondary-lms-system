import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

interface TeacherPendingAssignmentRow {
  id: string;
  title: string;
  dueDate: Date | null;
  _count: {
    submissions: number;
  };
  classrooms: {
    classroom: {
      name: string | null;
    };
  }[];
}

interface TeacherUpcomingAssignmentRow {
  id: string;
  title: string;
  dueDate: Date | null;
  classrooms: {
    classroom: {
      name: string | null;
    };
  }[];
}

interface TeacherCompletedAssignmentRow {
  id: string;
  title: string;
  dueDate: Date | null;
  classrooms: {
    classroom: {
      name: string | null;
    };
  }[];
}

type TeacherDashboardTaskPriority = 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'COMPLETED';

type TeacherDashboardTask = {
  id: string;
  type: 'ASSIGNMENT';
  title: string;
  detail: string;
  priority: TeacherDashboardTaskPriority;
  dueDate: Date;
  relatedClassroom: string;
  relatedId: string;
};

/**
 * API: GET /api/teachers/dashboard/tasks
 * Mục đích: Lấy danh sách công việc sắp tới của teacher
 * - Bài tập cần chấm (urgent)
 * - Bài tập sắp hết hạn
 * - Bài tập đã hoàn thành gần đây
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
    const tasks: TeacherDashboardTask[] = [];

    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const [pendingAssignments, upcomingAssignments, completedAssignments] = await Promise.all([
      // 1. Lấy bài tập có submissions chưa chấm (URGENT)
      prisma.assignment.findMany({
        where: {
          authorId: userId,
          submissions: { some: { grade: null } },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          _count: { select: { submissions: true } },
          classrooms: {
            select: { classroom: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 3,
      }) as unknown as Promise<TeacherPendingAssignmentRow[]>,

      // 2. Lấy bài tập sắp hết hạn (trong 3 ngày tới)
      prisma.assignment.findMany({
        where: {
          authorId: userId,
          dueDate: { gte: now, lte: threeDaysLater },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          classrooms: {
            select: { classroom: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 2,
      }) as unknown as Promise<TeacherUpcomingAssignmentRow[]>,

      // 3. Lấy bài tập đã hoàn thành gần đây (trong 2 ngày qua)
      prisma.assignment.findMany({
        where: {
          authorId: userId,
          dueDate: { gte: twoDaysAgo, lt: now },
          submissions: { every: { grade: { not: null } } },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          classrooms: {
            select: { classroom: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { dueDate: 'desc' },
        take: 1,
      }) as unknown as Promise<TeacherCompletedAssignmentRow[]>,
    ]);

    // Thêm vào danh sách tasks
    pendingAssignments.forEach((assignment: TeacherPendingAssignmentRow) => {
      const classroomName = assignment.classrooms[0]?.classroom.name || 'Không xác định';
      const isToday = assignment.dueDate 
        ? new Date(assignment.dueDate).toDateString() === now.toDateString()
        : false;

      tasks.push({
        id: assignment.id,
        type: 'ASSIGNMENT',
        title: 'Chấm bài tập',
        detail: `${assignment.title} - ${classroomName} - ${assignment._count.submissions} bài`,
        priority: isToday ? 'URGENT' : 'IMPORTANT',
        dueDate: assignment.dueDate || now,
        relatedClassroom: classroomName,
        relatedId: assignment.id,
      });
    });

    upcomingAssignments.forEach((assignment: TeacherUpcomingAssignmentRow) => {
      const classroomName = assignment.classrooms[0]?.classroom.name || 'Không xác định';
      const dueDate = assignment.dueDate || now;
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      tasks.push({
        id: `upcoming-${assignment.id}`,
        type: 'ASSIGNMENT',
        title: 'Bài tập sắp hết hạn',
        detail: `${assignment.title} - ${classroomName}`,
        priority: daysUntilDue <= 1 ? 'URGENT' : 'NORMAL',
        dueDate: dueDate,
        relatedClassroom: classroomName,
        relatedId: assignment.id,
      });
    });

    completedAssignments.forEach((assignment: TeacherCompletedAssignmentRow) => {
      const classroomName = assignment.classrooms[0]?.classroom.name || 'Không xác định';

      tasks.push({
        id: `completed-${assignment.id}`,
        type: 'ASSIGNMENT',
        title: 'Đã hoàn thành chấm bài',
        detail: `${assignment.title} - ${classroomName}`,
        priority: 'COMPLETED',
        dueDate: assignment.dueDate || now,
        relatedClassroom: classroomName,
        relatedId: assignment.id,
      });
    });

    // Sắp xếp theo priority và dueDate
    const priorityOrder: Record<TeacherDashboardTaskPriority, number> = {
      URGENT: 0,
      IMPORTANT: 1,
      NORMAL: 2,
      COMPLETED: 3,
    };
    tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                          priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return NextResponse.json({
      success: true,
      data: tasks.slice(0, 5), // Lấy tối đa 5 tasks
    });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/dashboard/tasks', error);
    return errorResponse(500, 'Internal server error');
  }
}
