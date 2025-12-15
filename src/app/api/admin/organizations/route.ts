import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";

const querySchema = z.object({
  search: z.string().max(200).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional().nullable(),
});

/**
 * GET /api/admin/organizations
 *
 * Input (query):
 * - search?: string
 * - cursor?: string
 * - limit?: number
 *
 * Output:
 * - success true + danh sách organizations + nextCursor
 *
 * Side effects:
 * - Read DB
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedQuery = querySchema.safeParse({
      search: req.nextUrl.searchParams.get("search") ?? undefined,
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });

    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { search, cursor, limit } = parsedQuery.data;

    const where = search
      ? {
          name: {
            contains: search.trim(),
            mode: "insensitive" as const,
          },
        }
      : undefined;

    const items = await prisma.organization.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const last = items.pop();
      nextCursor = last?.id ?? null;
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/organizations GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * POST /api/admin/organizations
 *
 * Input (body):
 * - name: string
 * - slug?: string | null
 *
 * Output:
 * - success true + created organization
 *
 * Side effects:
 * - Insert DB
 * - Write audit log
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const name = parsed.data.name.trim();
    const slug = parsed.data.slug?.trim() || null;

    const created = await prisma.organization.create({
      data: {
        name,
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "ADMIN_ORGANIZATION_CREATE",
        entityType: "ORGANIZATION",
        entityId: created.id,
        metadata: {
          name: created.name,
          slug: created.slug,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return errorResponse(409, "Slug đã tồn tại hoặc dữ liệu bị trùng.");
    }

    console.error("[API /api/admin/organizations POST] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
