import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

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

/**
 * API: GET /api/teachers/dashboard/tasks
 * Mục đích: Lấy danh sách công việc sắp tới của teacher
 * - Bài tập cần chấm (urgent)
 * - Bài tập sắp hết hạn
 * - Bài tập đã hoàn thành gần đây
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[API /api/teachers/dashboard/tasks] Bắt đầu xử lý request...');

    // Xác thực người dùng
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[API /api/teachers/dashboard/tasks] Không có session');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Kiểm tra role teacher
    if (userRole !== 'TEACHER') {
      console.error('[API /api/teachers/dashboard/tasks] User không phải teacher');
      return NextResponse.json(
        { success: false, message: 'Forbidden - Only teachers can access this endpoint' },
        { status: 403 }
      );
    }

    console.log(`[API /api/teachers/dashboard/tasks] Teacher ID: ${userId}`);

    const now = new Date();
    const tasks: any[] = [];

    // 1. Lấy bài tập có submissions chưa chấm (URGENT)
    const pendingAssignments = (await prisma.assignment.findMany({
      where: {
        authorId: userId,
        submissions: {
          some: {
            grade: null, // Chưa được chấm
          },
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        _count: {
          select: {
            submissions: true,
          },
        },
        classrooms: {
          select: {
            classroom: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 3,
    })) as TeacherPendingAssignmentRow[];

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

    // 2. Lấy bài tập sắp hết hạn (trong 3 ngày tới)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingAssignments = (await prisma.assignment.findMany({
      where: {
        authorId: userId,
        dueDate: {
          gte: now,
          lte: threeDaysLater,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        classrooms: {
          select: {
            classroom: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 2,
    })) as TeacherUpcomingAssignmentRow[];

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

    // 3. Lấy bài tập đã hoàn thành gần đây (trong 2 ngày qua)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const completedAssignments = (await prisma.assignment.findMany({
      where: {
        authorId: userId,
        dueDate: {
          gte: twoDaysAgo,
          lt: now,
        },
        submissions: {
          every: {
            grade: {
              not: null, // Tất cả đã được chấm
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        classrooms: {
          select: {
            classroom: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        dueDate: 'desc',
      },
      take: 1,
    })) as TeacherCompletedAssignmentRow[];

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
    const priorityOrder = { URGENT: 0, IMPORTANT: 1, NORMAL: 2, COMPLETED: 3 };
    tasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority as keyof typeof priorityOrder] - 
                          priorityOrder[b.priority as keyof typeof priorityOrder];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    console.log('[API /api/teachers/dashboard/tasks] Tasks:', tasks.length);

    return NextResponse.json({
      success: true,
      data: tasks.slice(0, 5), // Lấy tối đa 5 tasks
    });

  } catch (error) {
    console.error('[API /api/teachers/dashboard/tasks] Lỗi:', error);
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
