import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/courses/[id]
// Trả về thông tin khóa học theo id
export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const id = ctx?.params?.id;
    if (!id || typeof id !== "string") {
      console.error("[GET /api/courses/[id]] Thiếu hoặc sai định dạng id");
      return NextResponse.json(
        { success: false, message: "Missing or invalid id" },
        { status: 400 }
      );
    }

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error("[GET /api/courses/[id]] Lỗi:", error);
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

