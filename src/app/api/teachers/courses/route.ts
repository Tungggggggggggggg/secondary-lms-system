import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

export const runtime = "nodejs";

const listSchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  excludeClassroomId: z.string().min(1).optional(),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  coverImage: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const parsed = listSchema.safeParse({
      q: req.nextUrl.searchParams.get("q") || undefined,
      page: req.nextUrl.searchParams.get("page") || undefined,
      pageSize: req.nextUrl.searchParams.get("pageSize") || undefined,
      take: req.nextUrl.searchParams.get("take") || undefined,
      excludeClassroomId: req.nextUrl.searchParams.get("excludeClassroomId") || undefined,
    });
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const q = (parsed.data.q || "").trim();
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize;
    const takeLegacy = parsed.data.take;
    const excludeClassroomId = parsed.data.excludeClassroomId;

    const where = {
      authorId: user.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(excludeClassroomId
        ? {
            classrooms: {
              none: {
                classroomId: excludeClassroomId,
              },
            },
          }
        : {}),
    };

    const isPaginated = !!(page || pageSize);
    const effectivePage = page ?? 1;
    const effectivePageSize = Math.min(Math.max(pageSize ?? 20, 1), 50);
    const take = isPaginated
      ? effectivePageSize
      : Math.min(Math.max(takeLegacy ?? 50, 1), 200);
    const skip = isPaginated ? (effectivePage - 1) * effectivePageSize : 0;

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { lessons: true, classrooms: true } },
      },
      }),
      isPaginated ? prisma.course.count({ where }) : Promise.resolve(0),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { items, total: isPaginated ? total : undefined },
        pagination: isPaginated
          ? {
              page: effectivePage,
              pageSize: effectivePageSize,
              total,
              totalPages: Math.max(1, Math.ceil(total / effectivePageSize)),
              hasMore: effectivePage * effectivePageSize < total,
            }
          : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/teachers/courses] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

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
