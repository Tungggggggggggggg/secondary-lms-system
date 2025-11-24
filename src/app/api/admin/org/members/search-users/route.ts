import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { requireUserWrite } from "@/lib/rbac/guards";
import { parsePagination } from "@/lib/http/pagination";

// GET /api/admin/org/members/search-users?orgId=xxx&q=term&take=10
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return errorResponse(400, "Missing orgId");

  try {
    await requireUserWrite({ id: authUser.id, role: authUser.role }, orgId);
  } catch {
    return errorResponse(403, "Forbidden: insufficient permissions");
  }

  const q = (searchParams.get("q") || "").trim();
  const { take } = parsePagination(searchParams, { defaultTake: 10, maxTake: 20 });

  const where: any = {
    organizationMemberships: { none: { organizationId: orgId } },
  };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { fullname: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, email: true, fullname: true, role: true, createdAt: true },
  });

  return NextResponse.json({ success: true, items });
}, "ADMIN_ORG_MEMBERS_SEARCH_USERS");
