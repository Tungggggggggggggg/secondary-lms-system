import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";

// GET /api/admin/parent-students/users?role=PARENT|STUDENT
// Lấy danh sách users theo role (PARENT hoặc STUDENT)
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN or ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role")?.trim();
  const search = searchParams.get("search")?.trim();

  if (!role || (role !== "PARENT" && role !== "STUDENT")) {
    return errorResponse(400, "role must be PARENT or STUDENT");
  }

  try {
    const where: any = {
      role: role as "PARENT" | "STUDENT",
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullname: "asc" },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
      },
      take: 100, // Limit to 100 for dropdown
    });

    // Return real data from database, never mock data
    return NextResponse.json({ 
      success: true, 
      items: users || [] 
    });
  } catch (error: any) {
    console.error("[GET /api/admin/parent-students/users] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "ADMIN_PARENT_STUDENTS_USERS_LIST");

