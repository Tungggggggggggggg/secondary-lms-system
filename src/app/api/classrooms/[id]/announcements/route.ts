import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  isTeacherOfClassroom,
  isStudentInClassroom,
  getRequestId,
} from "@/lib/api-utils";
import { UserRole, ModerationStatus } from "@prisma/client";

// GET: Liệt kê announcements của một classroom (newest-first, có pagination)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "classroomId is required", requestId },
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

    // Quyền xem: giáo viên sở hữu lớp hoặc học sinh thuộc lớp
    const canView =
      (user.role === UserRole.TEACHER && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === UserRole.STUDENT && (await isStudentInClassroom(user.id, classroomId)));

    if (!canView) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));

    const [items, total] = await Promise.all([
      prisma.announcement.findMany({
        where: { classroomId, status: ModerationStatus.APPROVED },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
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
          _count: { select: { comments: true } },
        },
      }),
      prisma.announcement.count({ where: { classroomId, status: ModerationStatus.APPROVED } }),
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
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/classrooms/${params.id}/announcements {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, message: "classroomId is required", requestId },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom", requestId },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const content = (body?.content ?? "").toString().trim();
    if (!content) {
      return NextResponse.json(
        { success: false, message: "content is required", requestId },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      { success: true, data: created, requestId },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [POST] /api/classrooms/${params.id}/announcements {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


