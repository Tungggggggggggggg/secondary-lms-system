import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * API: GET /api/teachers/dashboard/activities
 * Mục đích: Lấy hoạt động gần đây liên quan đến teacher
 * - Học sinh nộp bài
 * - Học sinh tham gia lớp
 * - Bình luận mới
 * - Thông báo
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[API /api/teachers/dashboard/activities] Bắt đầu xử lý request...');

    // Xác thực người dùng
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[API /api/teachers/dashboard/activities] Không có session');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Kiểm tra role teacher
    if (userRole !== 'TEACHER') {
      console.error('[API /api/teachers/dashboard/activities] User không phải teacher');
      return NextResponse.json(
        { success: false, message: 'Forbidden - Only teachers can access this endpoint' },
        { status: 403 }
      );
    }

    console.log(`[API /api/teachers/dashboard/activities] Teacher ID: ${userId}`);

    const activities: any[] = [];

    // 1. Lấy submissions mới nhất (học sinh nộp bài)
    const recentSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: {
          authorId: userId,
        },
      },
      select: {
        id: true,
        submittedAt: true,
        student: {
          select: {
            fullname: true,
          },
        },
        assignment: {
          select: {
            title: true,
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
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
      take: 3,
    });

    recentSubmissions.forEach((submission) => {
      const classroomName = submission.assignment.classrooms[0]?.classroom.name || 'Không xác định';
      const timeAgo = getTimeAgo(new Date(submission.submittedAt));

      activities.push({
        id: `submission-${submission.id}`,
        type: 'SUBMISSION',
        actorName: submission.student.fullname,
        actorType: 'STUDENT',
        action: 'đã nộp bài tập',
        detail: `${submission.assignment.title} - ${classroomName} - ${timeAgo}`,
        timestamp: submission.submittedAt,
        relatedId: submission.id,
      });
    });

    // 2. Lấy học sinh mới tham gia lớp
    const newStudents = await prisma.classroomStudent.findMany({
      where: {
        classroom: {
          teacherId: userId,
        },
      },
      select: {
        id: true,
        joinedAt: true,
        student: {
          select: {
            fullname: true,
          },
        },
        classroom: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      take: 2,
    });

    newStudents.forEach((student) => {
      const timeAgo = getTimeAgo(new Date(student.joinedAt));

      activities.push({
        id: `join-${student.id}`,
        type: 'JOIN',
        actorName: student.student.fullname,
        actorType: 'STUDENT',
        action: 'đã tham gia lớp',
        detail: `${student.classroom.name} - ${timeAgo}`,
        timestamp: student.joinedAt,
        relatedId: student.id,
      });
    });

    // 3. Lấy bình luận mới trong các thông báo của lớp
    const recentComments = await prisma.announcementComment.findMany({
      where: {
        announcement: {
          classroom: {
            teacherId: userId,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        author: {
          select: {
            fullname: true,
            role: true,
          },
        },
        announcement: {
          select: {
            classroom: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 2,
    });

    recentComments.forEach((comment) => {
      const timeAgo = getTimeAgo(new Date(comment.createdAt));
      const actorType = comment.author.role === 'PARENT' ? 'PARENT' : 
                       comment.author.role === 'STUDENT' ? 'STUDENT' : 'TEACHER';

      activities.push({
        id: `comment-${comment.id}`,
        type: 'COMMENT',
        actorName: comment.author.fullname,
        actorType: actorType,
        action: 'đã bình luận',
        detail: `${comment.announcement.classroom.name} - ${timeAgo}`,
        timestamp: comment.createdAt,
        relatedId: comment.id,
      });
    });

    // Sắp xếp theo thời gian mới nhất
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log('[API /api/teachers/dashboard/activities] Activities:', activities.length);

    return NextResponse.json({
      success: true,
      data: activities.slice(0, 5), // Lấy tối đa 5 activities
    });

  } catch (error) {
    console.error('[API /api/teachers/dashboard/activities] Lỗi:', error);
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

/**
 * Helper function: Tính thời gian đã qua
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
