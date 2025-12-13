import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const s = String(val);
  return s.includes(",") || s.includes("\"") || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    if (!classroomId) {
      return errorResponse(400, "Missing classroom id");
    }

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, code: true, name: true },
    });

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    const links = await prisma.classroomStudent.findMany({
      where: { classroomId },
      orderBy: { joinedAt: "desc" },
      select: {
        joinedAt: true,
        student: { select: { id: true, email: true, fullname: true } },
      },
      take: 10000,
    });

    const header = ["studentId", "fullname", "email", "joinedAt"].join(",");
    const rows = links.map((l) => {
      return [
        escapeCsv(l.student.id),
        escapeCsv(l.student.fullname || ""),
        escapeCsv(l.student.email),
        escapeCsv(l.joinedAt.toISOString()),
      ].join(",");
    });

    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const filename = `classroom-${classroom.code}-students.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students/export GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
