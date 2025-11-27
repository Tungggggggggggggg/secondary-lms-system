import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// POST /api/admin/org/ownership/transfer
// body: { orgId: string, toUserId: string }
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  let body: { orgId?: string; toUserId?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const { orgId, toUserId } = body;
  if (!orgId || !toUserId) return errorResponse(400, "orgId and toUserId are required");

  const currentOwner = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, roleInOrg: "OWNER" as any },
    select: { id: true, userId: true },
  });
  if (!currentOwner) return errorResponse(409, "Organization has no OWNER to transfer from");

  // Only SUPER_ADMIN or the current OWNER can transfer ownership
  if (authUser.role !== "SUPER_ADMIN" && authUser.id !== currentOwner.userId) {
    return errorResponse(403, "Forbidden: only SUPER_ADMIN or current OWNER can transfer ownership");
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Demote current owner to ADMIN
      await tx.organizationMember.update({ where: { id: currentOwner.id }, data: { roleInOrg: "ADMIN" as any } });

      // Promote target user to OWNER (create membership if missing)
      const existingTarget = await tx.organizationMember.findFirst({
        where: { organizationId: orgId, userId: toUserId },
        select: { id: true },
      });
      if (existingTarget) {
        await tx.organizationMember.update({ where: { id: existingTarget.id }, data: { roleInOrg: "OWNER" as any } });
      } else {
        await tx.organizationMember.create({ data: { organizationId: orgId, userId: toUserId, roleInOrg: "OWNER" as any } });
      }
    });
  } catch (e: any) {
    console.error("[ORG_OWNERSHIP_TRANSFER] Failed transaction", e);
    return errorResponse(500, e?.message || "Failed to transfer ownership");
  }

  try {
    await writeAudit({
      actorId: authUser.id,
      action: "ORG_TRANSFER_OWNERSHIP",
      entityType: "ORGANIZATION",
      entityId: orgId,
      metadata: { fromUserId: currentOwner.userId, toUserId },
    });
  } catch (e) {
    console.error("[ORG_OWNERSHIP_TRANSFER] Failed to write audit", e);
  }

  return NextResponse.json({ success: true });
}, "ADMIN_ORG_TRANSFER_OWNERSHIP");
