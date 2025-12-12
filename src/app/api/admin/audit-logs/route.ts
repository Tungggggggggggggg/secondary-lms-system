import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { auditRepo } from "@/lib/repositories/audit-repo";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || undefined;
    const actorId = searchParams.get("actorId") || undefined;
    const action = searchParams.get("action") || undefined;
    const fromStr = searchParams.get("from") || undefined;
    const toStr = searchParams.get("to") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limitStr = searchParams.get("limit") || undefined;

    const from = fromStr ? new Date(fromStr) : undefined;
    const to = toStr ? new Date(toStr) : undefined;
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 1, 1), 100) : 50;

    const result = await auditRepo.query({
      organizationId: organizationId ?? null,
      actorId: actorId ?? null,
      action: action ?? null,
      from: from ?? null,
      to: to ?? null,
      limit,
      cursor: cursor ?? null,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[API /api/admin/audit-logs] Error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
