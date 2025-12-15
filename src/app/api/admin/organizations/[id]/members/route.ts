import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";

const paramsSchema = z.object({ id: z.string().min(1) });

const querySchema = z.object({
  search: z.string().max(200).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const createSchema = z.object({
  userId: z.string().min(1),
  roleInOrg: z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT", "PARENT"]).optional().nullable(),
});

const removeSchema = z.object({
  userId: z.string().min(1),
});

/**
 * GET /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - query: { search?: string; cursor?: string; limit?: number }
 *
 * Output:
 * - success true + members list + nextCursor
 *
 * Side effects:
 * - Read DB
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing organization id");
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

    const orgId = parsedParams.data.id;
    const { search, cursor, limit } = parsedQuery.data;

    const exists = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!exists) {
      return errorResponse(404, "Organization not found");
    }

    const where = {
      organizationId: orgId,
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search.trim(), mode: "insensitive" as const } },
                { fullname: { contains: search.trim(), mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const items = await prisma.organizationMember.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        roleInOrg: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
            createdAt: true,
          },
        },
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
    console.error("[API /api/admin/organizations/[id]/members GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * POST /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - body: { userId: string; roleInOrg?: 'OWNER'|'ADMIN'|'TEACHER'|'STUDENT'|'PARENT' | null }
 *
 * Output:
 * - success true + upserted membership
 *
 * Side effects:
 * - Upsert DB
 * - Write audit log
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing organization id");
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsedBody = createSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const orgId = parsedParams.data.id;
    const { userId, roleInOrg } = parsedBody.data;

    const [org, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } }),
    ]);

    if (!org) {
      return errorResponse(404, "Organization not found");
    }

    if (!user) {
      return errorResponse(404, "User not found");
    }

    const membership = await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      update: { roleInOrg: roleInOrg ?? undefined },
      create: { organizationId: orgId, userId, roleInOrg: roleInOrg ?? undefined },
      select: {
        id: true,
        roleInOrg: true,
        createdAt: true,
        user: { select: { id: true, email: true, fullname: true, role: true, createdAt: true } },
      },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "ADMIN_ORGANIZATION_MEMBER_UPSERT",
        entityType: "ORGANIZATION",
        entityId: orgId,
        metadata: {
          targetUserId: userId,
          targetEmail: user.email,
          roleInOrg: membership.roleInOrg ?? null,
          organizationName: org.name,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: membership }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/organizations/[id]/members POST] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * DELETE /api/admin/organizations/[id]/members
 *
 * Input:
 * - params.id: string
 * - body: { userId: string }
 *
 * Output:
 * - success true + removed (organizationId, userId)
 *
 * Side effects:
 * - Delete DB
 * - Write audit log
 */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing organization id");
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsedBody = removeSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const orgId = parsedParams.data.id;
    const { userId } = parsedBody.data;

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } });
    if (!org) {
      return errorResponse(404, "Organization not found");
    }

    const existing = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      select: { id: true, roleInOrg: true },
    });

    if (!existing) {
      return errorResponse(404, "Membership not found");
    }

    await prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "ADMIN_ORGANIZATION_MEMBER_REMOVE",
        entityType: "ORGANIZATION",
        entityId: orgId,
        metadata: {
          targetUserId: userId,
          roleInOrg: existing.roleInOrg ?? null,
          organizationName: org.name,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: { organizationId: orgId, userId } }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/organizations/[id]/members DELETE] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
