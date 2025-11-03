import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUser,
  getRequestId,
  isStudentInClassroom,
  isTeacherOfClassroom,
} from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

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
      (user.role === UserRole.TEACHER && (await isTeacherOfClassroom(user.id, classroomId))) ||
      (user.role === UserRole.STUDENT && (await isStudentInClassroom(user.id, classroomId)));
    if (!canComment) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
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

    const created = await prisma.announcementComment.create({
      data: {
        announcementId,
        authorId: user.id,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
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


