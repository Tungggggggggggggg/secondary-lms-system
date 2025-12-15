import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";

const paramsSchema = z.object({ id: z.string().min(1) });

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(120).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

/**
 * GET /api/admin/organizations/[id]
 *
 * Input (params):
 * - id: string
 *
 * Output:
 * - success true + organization detail (kèm _count)
 *
 * Side effects:
 * - Read DB
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing organization id");
    }

    const orgId = parsedParams.data.id;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            classrooms: true,
            courses: true,
          },
        },
      },
    });

    if (!org) {
      return errorResponse(404, "Organization not found");
    }

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    console.error("[API /api/admin/organizations/[id] GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * PATCH /api/admin/organizations/[id]
 *
 * Input:
 * - params.id: string
 * - body: { name?: string; slug?: string | null; status?: 'ACTIVE' | 'INACTIVE' }
 *
 * Output:
 * - success true + updated organization
 *
 * Side effects:
 * - Update DB
 * - Write audit log
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
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
    const parsedBody = updateSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const orgId = parsedParams.data.id;

    const exists = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!exists) {
      return errorResponse(404, "Organization not found");
    }

    const nextName = parsedBody.data.name?.trim();
    const nextSlug = parsedBody.data.slug === undefined ? undefined : parsedBody.data.slug?.trim() || null;

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(parsedBody.data.status !== undefined ? { status: parsedBody.data.status } : {}),
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
        action: "ADMIN_ORGANIZATION_UPDATE",
        entityType: "ORGANIZATION",
        entityId: updated.id,
        metadata: {
          name: updated.name,
          slug: updated.slug,
          status: updated.status,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      return errorResponse(409, "Slug đã tồn tại hoặc dữ liệu bị trùng.");
    }

    console.error("[API /api/admin/organizations/[id] PATCH] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
