import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

// GET: Danh sách submissions/grades của lớp cho giáo viên (newest-first, filter, search)
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

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "all") as "all" | "graded" | "ungraded";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    // Lấy assignmentIds của lớp
    const ac = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });
    const assignmentIds = ac.map((x) => x.assignmentId);
    if (assignmentIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [], statistics: { total: 0, graded: 0 }, requestId },
        { status: 200 }
      );
    }

    // Base where
    const where: any = { assignmentId: { in: assignmentIds } };
    if (status === "graded") where.grade = { not: null };
    if (status === "ungraded") where.grade = null;

    const submissions = await prisma.assignmentSubmission.findMany({
      where,
      include: {
        assignment: { select: { id: true, title: true, type: true, dueDate: true } },
        student: { select: { id: true, fullname: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    let data = submissions.map((s) => ({
      id: s.id,
      student: { id: s.student.id, fullname: s.student.fullname, email: s.student.email },
      assignment: { id: s.assignment.id, title: s.assignment.title, type: s.assignment.type, dueDate: s.assignment.dueDate?.toISOString() || null },
      grade: s.grade,
      feedback: s.feedback,
      submittedAt: s.submittedAt.toISOString(),
      status: s.grade !== null ? "graded" : "submitted",
    }));

    if (search) {
      data = data.filter((d) =>
        d.student.fullname.toLowerCase().includes(search) ||
        d.student.email.toLowerCase().includes(search) ||
        d.assignment.title.toLowerCase().includes(search)
      );
    }

    const graded = data.filter((d) => d.grade !== null).length;
    const total = await prisma.assignmentSubmission.count({ where });

    const res = NextResponse.json(
      { success: true, data, statistics: { total: data.length, graded }, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, requestId },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "public, max-age=10, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/grades {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


