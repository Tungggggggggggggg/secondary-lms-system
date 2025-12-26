import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  isTeacherOfClassroom,
  isStudentInClassroom,
  getRequestId,
} from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

const getQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().max(200).default(""),
  sort: z.enum(["new", "comments", "attachments"]).default("new"),
  hasAttachment: z.enum(["true", "false"]).optional(),
});

const postBodySchema = z
  .object({
    content: z.string().min(1).max(5000),
  })
  .strict();

// GET: Liệt kê announcements của một classroom (newest-first, có pagination)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return errorResponse(400, "classroomId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    // Quyền xem: giáo viên sở hữu lớp hoặc học sinh thuộc lớp
    const isTeacherOwner =
      user.role === "TEACHER" && (await isTeacherOfClassroom(user.id, classroomId));
    const isStudentMember =
      user.role === "STUDENT" && (await isStudentInClassroom(user.id, classroomId));
    const canView = isTeacherOwner || isStudentMember;

    if (!canView) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = getQuerySchema.safeParse({
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      q: searchParams.get("q") || undefined,
      sort: searchParams.get("sort") || undefined,
      hasAttachment: searchParams.get("hasAttachment") || undefined,
    });

    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { page, pageSize, q, sort, hasAttachment } = parsedQuery.data;

    const where: Prisma.AnnouncementWhereInput = { classroomId };
    if (q) {
      where.OR = [
        { content: { contains: q, mode: "insensitive" } },
        { author: { is: { fullname: { contains: q, mode: "insensitive" } } } },
      ];
    }
    if (hasAttachment != null) {
      const flag = hasAttachment === "true";
      if (flag) where.attachments = { some: {} };
    }

    const secondaryOrder: Prisma.AnnouncementOrderByWithRelationInput =
      sort === "comments"
        ? { comments: { _count: "desc" } }
        : sort === "attachments"
        ? { attachments: { _count: "desc" } }
        : { createdAt: "desc" };
    const orderBy: Prisma.AnnouncementOrderByWithRelationInput[] = [{ pinnedAt: "desc" }, secondaryOrder];

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          pinnedAt: true,
          author: { select: { id: true, fullname: true, email: true } },
          attachments: {
            select: {
              id: true,
              name: true,
              path: true,
              size: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      prisma.announcement.count({ where }),
    ]);

    const res = NextResponse.json(
      {
        success: true,
        data: items,
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
    res.headers.set("Cache-Control", "public, max-age=15, s-maxage=60, stale-while-revalidate=60");
    return res;
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/classrooms/${params.id}/announcements {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}

// POST: Tạo announcement mới (teacher sở hữu lớp)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return errorResponse(400, "classroomId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return errorResponse(403, "Forbidden - Not your classroom", { requestId });
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const content = parsedBody.data.content.trim();

    // Xác định organizationId từ classroom
    const classroom = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { organizationId: true } });

    const created = await prisma.announcement.create({
      data: {
        classroomId,
        authorId: user.id,
        content,
        organizationId: classroom?.organizationId ?? null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      const classroomStudents = await prisma.classroomStudent.findMany({
        where: { classroomId },
        select: { studentId: true },
      });

      const actionUrl = `/dashboard/student/classes/${classroomId}/announcements/${created.id}`;
      const snippet = created.content.length > 140 ? `${created.content.slice(0, 140)}...` : created.content;

      if (classroomStudents.length > 0) {
        await notificationRepo.addMany(
          classroomStudents.map((cs) => ({
            userId: cs.studentId,
            input: {
              type: "STUDENT_ANNOUNCEMENT_NEW",
              title: "Bảng tin mới",
              description: snippet,
              actionUrl,
              dedupeKey: `announcement:new:${created.id}:${cs.studentId}`,
              meta: { classroomId, announcementId: created.id },
            },
          }))
        );
      }
    } catch (err) {
      console.error(
        `[WARN] Failed to create announcement notifications {requestId:${requestId}}`,
        err
      );
    }

    return NextResponse.json(
      { success: true, data: created, requestId },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [POST] /api/classrooms/${params.id}/announcements {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


