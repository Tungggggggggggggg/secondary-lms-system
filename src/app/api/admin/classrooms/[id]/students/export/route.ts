import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { toXlsxArrayBuffer } from "@/lib/excel";

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

    const headers = ["studentId", "fullname", "email", "joinedAt"];
    const rows = links.map((l) => [
      l.student.id,
      l.student.fullname || "",
      l.student.email,
      l.joinedAt.toISOString(),
    ]);

    const arrayBuffer = toXlsxArrayBuffer(headers, rows, { sheetName: "Students" });
    const filename = `classroom-${classroom.code}-students.xlsx`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students/export GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
