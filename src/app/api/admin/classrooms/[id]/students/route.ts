import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    if (!classroomId) {
      return errorResponse(400, "Missing classroom id");
    }

    const { searchParams } = new URL(req.url);
    const pageRaw = parseInt(searchParams.get("page") || "1", 10) || 1;
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
    const page = Math.max(1, pageRaw);
    const pageSize = Math.min(Math.max(pageSizeRaw, 5), 100);
    const q = (searchParams.get("q") || "").trim();

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, code: true },
    });

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    const where: any = {
      classroomId,
      ...(q
        ? {
            student: {
              is: {
                OR: [
                  { email: { contains: q, mode: "insensitive" as const } },
                  { fullname: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
          }
        : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.classroomStudent.count({ where }),
      prisma.classroomStudent.findMany({
        where,
        orderBy: { joinedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          joinedAt: true,
          student: { select: { id: true, email: true, fullname: true, role: true } },
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.student.id,
      email: r.student.email,
      fullname: r.student.fullname,
      role: r.student.role,
      joinedAt: r.joinedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          classroom,
          items,
          page,
          pageSize,
          total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
