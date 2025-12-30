import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || undefined;
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const fromStr = searchParams.get("from") || undefined;
    const toStr = searchParams.get("to") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limitStr = searchParams.get("limit") || undefined;

    let from: Date | undefined;
    if (fromStr) {
      from = new Date(fromStr);
      if (Number.isNaN(from.getTime())) {
        return errorResponse(400, "Invalid from date");
      }
    }

    let to: Date | undefined;
    if (toStr) {
      to = new Date(toStr);
      if (Number.isNaN(to.getTime())) {
        return errorResponse(400, "Invalid to date");
      }
    }
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 1, 1), 100) : 50;

    const result = await auditRepo.query({
      organizationId: organizationId ?? null,
      actorId: actorId ?? null,
      action: action ?? null,
      entityType: entityType ?? null,
      from: from ?? null,
      to: to ?? null,
      limit,
      cursor: cursor ?? null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[API /api/admin/audit-logs] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
