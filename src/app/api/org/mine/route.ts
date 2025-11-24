import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const GET = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (user.role === "SUPER_ADMIN") {
    const items = await prisma.organization.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      take: 200,
      select: { id: true, name: true },
    });
    return NextResponse.json({ success: true, items });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, organization: q ? { name: { contains: q, mode: "insensitive" } } : undefined },
    orderBy: { organization: { name: "asc" } },
    select: { organization: { select: { id: true, name: true } } },
  });
  const items = memberships.map((m) => m.organization);
  return NextResponse.json({ success: true, items });
}, "ORG_MINE_LIST");
