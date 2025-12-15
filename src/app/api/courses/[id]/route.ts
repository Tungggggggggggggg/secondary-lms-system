import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { errorResponse } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

// GET /api/courses/[id]
// Trả về thông tin khóa học theo id
export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing or invalid id");
    }

    const { id } = parsedParams.data;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return errorResponse(404, "Course not found");
    }

    return NextResponse.json({ success: true, data: course });
  } catch (error: unknown) {
    console.error("[GET /api/courses/[id]] Lỗi:", error);
    return errorResponse(500, "Internal server error");
  }
}

