import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * API GET submissions cho một assignment nhất định
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string }}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!me || me.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    // Kiểm tra ownership (có được xem assignment này không)
    const assignment = await prisma.assignment.findFirst({ where: { id: params.id, authorId: me.id } });
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    // Lấy submissions (inner join student thông tin cơ bản)
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: params.id },
      include: {
        student: { select: { id: true, fullname: true, email: true } }
      },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json({ success: true, data: submissions }, { status: 200 });
  } catch (error) {
    console.error("[API SUBMISSIONS GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
