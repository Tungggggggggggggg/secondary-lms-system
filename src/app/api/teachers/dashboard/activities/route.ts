import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

interface TeacherDashboardSubmissionActivityRow {
  id: string;
  submittedAt: Date;
  assignmentId: string;
  student: {
    fullname: string | null;
  };
  assignment: {
    title: string;
    classrooms: {
      classroomId: string;
      classroom: {
        name: string | null;
      };
    }[];
  };
}

interface TeacherDashboardNewStudentRow {
  id: string;
  joinedAt: Date;
  student: {
    fullname: string | null;
  };
  classroom: {
    id: string;
    name: string | null;
  };
}

interface TeacherDashboardAnnouncementCommentRow {
  id: string;
  createdAt: Date;
  author: {
    fullname: string | null;
    role: string;
  };
  announcement: {
    id: string;
    classroom: {
      id: string;
      name: string | null;
    };
  };
}

type TeacherDashboardActorType = 'STUDENT' | 'TEACHER' | 'PARENT';

type TeacherDashboardActivity =
  | {
      id: string;
      type: 'SUBMISSION';
      actorName: string;
      actorType: 'STUDENT';
      action: string;
      detail: string;
      timestamp: Date;
      relatedId: string;
      assignmentId: string;
      classroomId?: string;
    }
  | {
      id: string;
      type: 'JOIN';
      actorName: string;
      actorType: 'STUDENT';
      action: string;
      detail: string;
      timestamp: Date;
      relatedId: string;
      classroomId: string;
    }
  | {
      id: string;
      type: 'COMMENT';
      actorName: string;
      actorType: TeacherDashboardActorType;
      action: string;
      detail: string;
      timestamp: Date;
      relatedId: string;
      announcementId: string;
      classroomId: string;
    };

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
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, 'Unauthorized');
    }

    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Only teachers can access this endpoint');
    }

    const userId = authUser.id;
    const activities: TeacherDashboardActivity[] = [];

    const [recentSubmissions, newStudents, recentComments] = await Promise.all([
      // 1. Lấy submissions mới nhất (học sinh nộp bài)
      prisma.assignmentSubmission.findMany({
        where: {
          assignment: { authorId: userId },
        },
        select: {
          id: true,
          assignmentId: true,
          submittedAt: true,
          student: { select: { fullname: true } },
          assignment: {
            select: {
              title: true,
              classrooms: {
                select: {
                  classroomId: true,
                  classroom: { select: { name: true } },
                },
                take: 1,
              },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 3,
      }) as unknown as Promise<TeacherDashboardSubmissionActivityRow[]>,

      // 2. Lấy học sinh mới tham gia lớp
      prisma.classroomStudent.findMany({
        where: {
          classroom: { teacherId: userId },
        },
        select: {
          id: true,
          joinedAt: true,
          student: { select: { fullname: true } },
          classroom: { select: { id: true, name: true } },
        },
        orderBy: { joinedAt: 'desc' },
        take: 2,
      }) as unknown as Promise<TeacherDashboardNewStudentRow[]>,

      // 3. Lấy bình luận mới trong các thông báo của lớp
      prisma.announcementComment.findMany({
        where: {
          announcement: { classroom: { teacherId: userId } },
        },
        select: {
          id: true,
          createdAt: true,
          author: { select: { fullname: true, role: true } },
          announcement: {
            select: {
              id: true,
              classroom: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }) as unknown as Promise<TeacherDashboardAnnouncementCommentRow[]>,
    ]);

    recentSubmissions.forEach((submission: TeacherDashboardSubmissionActivityRow) => {
      const firstClassroom = submission.assignment.classrooms[0];
      const classroomName = firstClassroom?.classroom.name || 'Không xác định';
      const timeAgo = getTimeAgo(new Date(submission.submittedAt));
      const actorName = submission.student.fullname?.trim() || 'Học sinh';

      activities.push({
        id: `submission-${submission.id}`,
        type: 'SUBMISSION',
        actorName,
        actorType: 'STUDENT',
        action: 'đã nộp bài tập',
        detail: `${submission.assignment.title} - ${classroomName} - ${timeAgo}`,
        timestamp: submission.submittedAt,
        relatedId: submission.id,
        assignmentId: submission.assignmentId,
        classroomId: firstClassroom?.classroomId,
      });
    });

    newStudents.forEach((student: TeacherDashboardNewStudentRow) => {
      const timeAgo = getTimeAgo(new Date(student.joinedAt));
      const actorName = student.student.fullname?.trim() || 'Học sinh';

      activities.push({
        id: `join-${student.id}`,
        type: 'JOIN',
        actorName,
        actorType: 'STUDENT',
        action: 'đã tham gia lớp',
        detail: `${student.classroom.name} - ${timeAgo}`,
        timestamp: student.joinedAt,
        relatedId: student.id,
        classroomId: student.classroom.id,
      });
    });

    recentComments.forEach((comment: TeacherDashboardAnnouncementCommentRow) => {
      const timeAgo = getTimeAgo(new Date(comment.createdAt));
      const actorType = comment.author.role === 'PARENT' ? 'PARENT' : 
                       comment.author.role === 'STUDENT' ? 'STUDENT' : 'TEACHER';
      const actorName = comment.author.fullname?.trim() || 'Người dùng';

      activities.push({
        id: `comment-${comment.id}`,
        type: 'COMMENT',
        actorName,
        actorType: actorType,
        action: 'đã bình luận',
        detail: `${comment.announcement.classroom.name} - ${timeAgo}`,
        timestamp: comment.createdAt,
        relatedId: comment.id,
        announcementId: comment.announcement.id,
        classroomId: comment.announcement.classroom.id,
      });
    });

    // Sắp xếp theo thời gian mới nhất
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      data: activities.slice(0, 5), // Lấy tối đa 5 activities
    });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/dashboard/activities', error);
    return errorResponse(500, 'Internal server error');
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
