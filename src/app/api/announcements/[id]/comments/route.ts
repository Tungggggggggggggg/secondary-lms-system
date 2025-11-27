import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  getRequestId,
  isStudentInClassroom,
  isTeacherOfClassroom,
} from "@/lib/api-utils";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";

// GET: Lấy danh sách comments của một announcement (teacher owner hoặc student trong lớp)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const announcementId = params.id;
    if (!announcementId) {
      return NextResponse.json(
        { success: false, message: "announcementId is required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    // Lấy thông tin announcement và classroomId
    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return NextResponse.json(
        { success: false, message: "Announcement not found", requestId },
        { status: 404 }
      );
    }

    const classroomId = ann.classroomId;

    // Kiểm tra quyền truy cập: giáo viên sở hữu lớp hoặc học sinh trong lớp
    const isTeacherOwner = user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId));
    const isStudentMember = user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId));
    const canView = isTeacherOwner || isStudentMember;
    if (!canView) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
        { status: 403 }
      );
    }

    // Lấy query params
    const { searchParams } = new URL(req.url);
    const recent = searchParams.get("recent") === "true";
    const includeHidden = searchParams.get("includeHidden") === "true";
    const statusFilter = isTeacherOwner && includeHidden ? undefined : "APPROVED" as const;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = recent ? 2 : Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

    if (recent) {
      // Lấy tất cả top-level comments để đếm và lấy ngẫu nhiên
      const allTopLevelComments = await prisma.announcementComment.findMany({
        where: {
          announcementId,
          parentId: null, // Chỉ lấy top-level comments
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

      const total = allTopLevelComments.length;
      let pickedTopLevel: typeof allTopLevelComments = [];

      // Logic: nếu <= 2 comments thì trả về tất cả, nếu > 3 thì lấy 1-2 ngẫu nhiên
      if (total <= 2) {
        pickedTopLevel = allTopLevelComments;
      } else if (total > 3) {
        const randomCount = Math.floor(Math.random() * 2) + 1; // 1 hoặc 2
        const shuffled = [...allTopLevelComments].sort(() => Math.random() - 0.5);
        pickedTopLevel = shuffled.slice(0, randomCount);
        pickedTopLevel.sort(
          (
            a: { createdAt: Date | string },
            b: { createdAt: Date | string }
          ) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        pickedTopLevel = allTopLevelComments;
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

      console.log(
        `[INFO] [GET] /api/announcements/${announcementId}/comments?recent=true - Picked ${recentWithReplies.length}/${total} top-level with ${replies.length} replies (requestId: ${requestId})`
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

    console.log(
      `[INFO] [GET] /api/announcements/${announcementId}/comments - Found ${topLevelComments.length} top-level comments with ${replies.length} replies (page ${page}, total: ${total}, requestId: ${requestId})`
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
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/announcements/${params.id}/comments {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, message: "announcementId is required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const ann = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { classroomId: true },
    });
    if (!ann) {
      return NextResponse.json(
        { success: false, message: "Announcement not found", requestId },
        { status: 404 }
      );
    }

    const classroomId = ann.classroomId;
    const canComment =
      (user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId)));
    if (!canComment) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
        { status: 403 }
      );
    }

    // Chặn bình luận nếu bài đăng đã khóa (dùng raw SQL để tương thích trước/ sau migrate)
    try {
      const lockedRows = await prisma.$queryRaw<{ comments_locked: boolean }[]>`SELECT "comments_locked" FROM "announcements" WHERE id = ${announcementId} LIMIT 1`;
      if (Array.isArray(lockedRows) && lockedRows[0]?.comments_locked) {
        return NextResponse.json(
          { success: false, message: "Bình luận đã bị khóa cho bài đăng này", requestId },
          { status: 403 }
        );
      }
    } catch {}

    // Rate limit bình luận theo ip+user+org
    try {
      const ip = (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim();
      const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { organizationId: true } });
      enforceRateLimit({ route: "announcements.comments.post", ip, userId: user.id, orgId: classroom?.organizationId || undefined, limit: 8, windowMs: 30_000 });
    } catch (e) {
      if (e instanceof RateLimitError) {
        return NextResponse.json(
          { success: false, message: "Bạn đang bình luận quá nhanh, vui lòng thử lại sau", requestId },
          { status: 429 }
        );
      }
    }

    const body = await req.json().catch(() => null);
    const content = (body?.content ?? "").toString().trim();
    if (!content) {
      return NextResponse.json(
        { success: false, message: "content is required", requestId },
        { status: 400 }
      );
    }

    // Lấy parentId nếu có (cho reply comments)
    const parentId = body?.parentId ? body.parentId.toString().trim() : null;

    // Validate parentId nếu có (phải tồn tại và thuộc cùng announcement)
    if (parentId) {
      const parentComment = await prisma.announcementComment.findUnique({
        where: { id: parentId },
        select: { announcementId: true },
      });

      if (!parentComment) {
        return NextResponse.json(
          { success: false, message: "Parent comment not found", requestId },
          { status: 404 }
        );
      }

      if (parentComment.announcementId !== announcementId) {
        return NextResponse.json(
          { success: false, message: "Parent comment does not belong to this announcement", requestId },
          { status: 400 }
        );
      }
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

    return NextResponse.json(
      { success: true, data: created, requestId },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [POST] /api/announcements/${params.id}/comments {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


