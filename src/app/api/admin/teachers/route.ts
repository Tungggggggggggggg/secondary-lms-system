import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const takeRaw = parseInt(searchParams.get("limit") || "50", 10) || 50;
    const take = Math.min(Math.max(takeRaw, 1), 200);

    const where: any = {
      role: "TEACHER",
      ...(q
        ? {
            OR: [
              { fullname: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const items = await prisma.user.findMany({
      where,
      take,
      orderBy: { fullname: "asc" },
      select: { id: true, fullname: true, email: true },
    });

    return NextResponse.json({ success: true, data: { items } }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/teachers] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
