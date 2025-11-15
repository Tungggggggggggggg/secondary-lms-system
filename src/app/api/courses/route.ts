import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/courses?orgId=...
// Trả về danh sách courses, nếu có orgId thì lọc theo organization
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    const courses = await prisma.course.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, authorId: true, organizationId: true, createdAt: true },
    });

    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    console.error("[GET /api/courses] Lỗi:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

