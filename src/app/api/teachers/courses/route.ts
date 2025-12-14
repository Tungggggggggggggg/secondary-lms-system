import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const takeRaw = req.nextUrl.searchParams.get("take");
    const take = Math.min(Math.max(Number(takeRaw ?? 50) || 50, 1), 200);

    const items = await prisma.course.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { lessons: true, classrooms: true } },
      },
    });

    return NextResponse.json({ success: true, data: { items } }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/teachers/courses] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) return errorResponse(401, "Unauthorized");

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const created = await prisma.course.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.toString().trim() || null,
        coverImage: parsed.data.coverImage?.toString().trim() || null,
        authorId: user.id,
        organizationId: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teachers/courses] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
