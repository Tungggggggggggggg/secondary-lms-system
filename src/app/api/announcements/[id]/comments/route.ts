import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  getRequestId,
  isStudentInClassroom,
  isTeacherOfClassroom,
} from "@/lib/api-utils";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { notificationRepo } from "@/lib/repositories/notification-repo";

// GET: Lấy danh sách comments của một announcement (teacher owner hoặc student trong lớp)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    if (!announcementId) {
      return errorResponse(400, "announcementId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    // Lấy thông tin announcement và classroomId
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return errorResponse(404, "Announcement not found", { requestId });
    }

    const classroomId = ann.classroomId;

    // Kiểm tra quyền truy cập: giáo viên sở hữu lớp hoặc học sinh trong lớp
    const isTeacherOwner = user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId));
    const isStudentMember = user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId));
    const canView = isTeacherOwner || isStudentMember;
    if (!canView) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    // Lấy query params
    const { searchParams } = new URL(req.url);
    const recent = searchParams.get("recent") === "true";
    const includeHidden = searchParams.get("includeHidden") === "true";
    const statusFilter = isTeacherOwner && includeHidden ? undefined : "APPROVED" as const;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = recent ? 2 : Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

    if (recent) {
      const whereTopLevel = {
        announcementId,
        parentId: null as string | null,
        ...(statusFilter ? { status: statusFilter } : {}),
      };

      const total = await prisma.announcementComment.count({ where: whereTopLevel });

      const selectComment = {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        status: true,
        author: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      } as const;

      let pickedTopLevel: Array<{
        id: string;
        content: string;
        createdAt: Date | string;
        parentId: string | null;
        status: string;
        author: { id: string; fullname: string; email: string };
      }> = [];

      // Logic: nếu <= 3 comments thì trả về tất cả; nếu > 3 thì lấy 1-2 ngẫu nhiên
      if (total <= 3) {
        pickedTopLevel = total
          ? await prisma.announcementComment.findMany({
              where: whereTopLevel,
              orderBy: { createdAt: "asc" },
              take: total,
              select: selectComment,
            })
          : [];
      } else {
        const randomCount = Math.floor(Math.random() * 2) + 1; // 1 hoặc 2
        const offsets = new Set<number>();
        while (offsets.size < randomCount) {
          offsets.add(Math.floor(Math.random() * total));
        }

        const chunks = await Promise.all(
          Array.from(offsets).map((offset) =>
            prisma.announcementComment.findMany({
              where: whereTopLevel,
              orderBy: { createdAt: "asc" },
              skip: offset,
              take: 1,
              select: selectComment,
            })
          )
        );
        pickedTopLevel = chunks.flat();
        pickedTopLevel.sort(
          (
            a: { createdAt: Date | string },
            b: { createdAt: Date | string }
          ) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }

      // Lấy replies cho các top-level đã chọn và gắn vào data (nested structure)
      const parentIds = pickedTopLevel.map((c: { id: string }) => c.id);
      let replies: Array<{
        id: string;
        content: string;
        createdAt: Date | string;
        parentId: string | null;
        author: { id: string; fullname: string; email: string };
      }> = [];
      if (parentIds.length > 0) {
        replies = await prisma.announcementComment.findMany({
          where: {
            announcementId,
            parentId: { in: parentIds },
            ...(statusFilter ? { status: statusFilter } : {}),
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            status: true,
            author: {
              select: { id: true, fullname: true, email: true },
            },
          },
        });
      }

      const repliesByParent = replies.reduce(
        (
          acc: Record<string, typeof replies>,
          reply: {
            id: string;
            content: string;
            createdAt: Date | string;
            parentId: string | null;
            author: { id: string; fullname: string; email: string };
          }
        ) => {
          if (!reply.parentId) return acc;
          if (!acc[reply.parentId]) acc[reply.parentId] = [] as typeof replies;
          acc[reply.parentId].push(reply);
          return acc;
        },
        {} as Record<string, typeof replies>
      );

      const recentWithReplies = pickedTopLevel.map(
        (tl: { id: string } & { [key: string]: unknown }) => ({
          ...tl,
          replies: repliesByParent[tl.id] || [],
        })
      );

      return NextResponse.json(
        {
          success: true,
          data: recentWithReplies,
          total, // Tổng số top-level comments
          requestId,
        },
        { status: 200 }
      );
    }

    // Query tất cả comments với nested structure
    // Lấy top-level comments (parentId = null) và replies của chúng
    const [topLevelComments, total] = await Promise.all([
      prisma.announcementComment.findMany({
        where: {
          announcementId,
          parentId: null, // Chỉ lấy top-level comments
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          createdAt: true,
          parentId: true,
          status: true,
          author: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
        },
      }),
      prisma.announcementComment.count({
        where: {
          announcementId,
          parentId: null, // Chỉ đếm top-level comments cho pagination
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      }),
    ]);

    // Lấy tất cả reply comments cho các top-level comments đã lấy
    const topLevelIds = topLevelComments.map((c: { id: string }) => c.id);
    let replies: Array<{
      id: string;
      content: string;
      createdAt: Date | string;
      parentId: string | null;
      author: { id: string; fullname: string; email: string };
    }> = [];

    // Tối ưu: nếu không có top-level ids thì bỏ qua query replies để tránh IN [] (AND 1=0)
    if (topLevelIds.length > 0) {
      replies = await prisma.announcementComment.findMany({
        where: {
          announcementId,
          parentId: { in: topLevelIds },
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          parentId: true,
          status: true,
          author: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
        },
      });
    }

    // Group replies theo parentId
    const repliesByParent = replies.reduce(
      (
        acc: Record<string, typeof replies>,
        reply: {
          id: string;
          content: string;
          createdAt: Date | string;
          parentId: string | null;
          author: { id: string; fullname: string; email: string };
        }
      ) => {
        if (!reply.parentId) return acc;
        if (!acc[reply.parentId]) acc[reply.parentId] = [] as typeof replies;
        acc[reply.parentId].push(reply);
        return acc;
      },
      {} as Record<string, typeof replies>
    );

    // Kết hợp top-level comments với replies
    const commentsWithReplies = topLevelComments.map(
      (
        comment: {
          id: string;
          content: string;
          createdAt: Date | string;
          parentId: string | null;
          status: string;
          author: { id: string; fullname: string; email: string };
        }
      ) => ({
        ...comment,
        replies: repliesByParent[comment.id] || [],
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: commentsWithReplies,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
        requestId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/announcements/${params.id}/comments {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}

// POST: Thêm bình luận vào một announcement (teacher owner hoặc student trong lớp)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    if (!announcementId) {
      return errorResponse(400, "announcementId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return errorResponse(404, "Announcement not found", { requestId });
    }

    const classroomId = ann.classroomId;
    const canComment =
      (user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId)));
    if (!canComment) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    // Chặn bình luận nếu bài đăng đã khóa (dùng raw SQL để tương thích trước/ sau migrate)
    try {
      const lockedRows = await prisma.$queryRaw<{ comments_locked: boolean }[]>`SELECT "comments_locked" FROM "announcements" WHERE id = ${announcementId} LIMIT 1`;
      if (Array.isArray(lockedRows) && lockedRows[0]?.comments_locked) {
        return errorResponse(403, "Bình luận đã bị khóa cho bài đăng này", { requestId });
      }
    } catch {}

    // Rate limit bình luận theo ip+user+org
    try {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { organizationId: true } });
      enforceRateLimit({ route: "announcements.comments.post", ip, userId: user.id, orgId: classroom?.organizationId || undefined, limit: 8, windowMs: 30_000 });
    } catch (e) {
      if (e instanceof RateLimitError) {
        return errorResponse(429, "Bạn đang bình luận quá nhanh, vui lòng thử lại sau", { requestId });
      }
    }

    const body = await req.json().catch(() => null);
    const content = (body?.content ?? "").toString().trim();
    if (!content) {
      return errorResponse(400, "content is required", { requestId });
    }

    // Lấy parentId nếu có (cho reply comments)
    const parentId = body?.parentId ? body.parentId.toString().trim() : null;

    let parentAuthorId: string | null = null;
    let parentAuthorRole: string | null = null;

    // Validate parentId nếu có (phải tồn tại và thuộc cùng announcement)
    if (parentId) {
      const parentComment = await prisma.announcementComment.findUnique({
        where: { id: parentId },
        select: { announcementId: true, authorId: true, author: { select: { role: true } } },
      });

      if (!parentComment) {
        return errorResponse(404, "Parent comment not found", { requestId });
      }

      if (parentComment.announcementId !== announcementId) {
        return errorResponse(400, "Parent comment does not belong to this announcement", { requestId });
      }

      parentAuthorId = parentComment.authorId;
      parentAuthorRole = (parentComment.author as { role?: string } | null | undefined)?.role ?? null;
    }

    const created = await prisma.announcementComment.create({
      data: {
        announcementId,
        authorId: user.id,
        content,
        parentId: parentId || null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        author: { select: { id: true, fullname: true, email: true } },
      },
    });

    try {
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { teacherId: true },
      });

      const teacherId = classroom?.teacherId;
      if (teacherId && teacherId !== user.id) {
        await notificationRepo.add(teacherId, {
          type: "TEACHER_ANNOUNCEMENT_COMMENT_NEW",
          title: "Bình luận mới trong bài đăng",
          description: (content || "").slice(0, 200),
          actionUrl: `/dashboard/teacher/classrooms/${classroomId}/announcements/${announcementId}`,
          dedupeKey: `annComment:${announcementId}:${created.id}`,
          meta: { announcementId, classroomId, commentId: created.id },
        });
      }

      if (parentId && parentAuthorId && parentAuthorRole === "STUDENT" && parentAuthorId !== user.id) {
        await notificationRepo.add(parentAuthorId, {
          type: "STUDENT_ANNOUNCEMENT_REPLY",
          title: "Có người trả lời bình luận của bạn",
          description: (content || "").slice(0, 200),
          actionUrl: `/dashboard/student/classes/${classroomId}/announcements/${announcementId}`,
          dedupeKey: `annReply:${announcementId}:${parentId}:${created.id}`,
          meta: { announcementId, classroomId, parentId, commentId: created.id },
        });
      }
    } catch {}

    return NextResponse.json(
      { success: true, data: created, requestId },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [POST] /api/announcements/${params.id}/comments {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


