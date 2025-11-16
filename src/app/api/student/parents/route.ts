/**
 * API endpoint cho học sinh lấy danh sách phụ huynh đã liên kết
 * GET /api/student/parents
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import prisma from "@/lib/prisma";

export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    // Xác thực user và kiểm tra role
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden: STUDENT role only");
    }

    // Lấy danh sách phụ huynh đã liên kết
    const parentLinks = await prisma.parentStudent.findMany({
      where: {
        studentId: authUser.id,
        status: "ACTIVE",
      },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`[INFO] STUDENT_PARENTS_LIST OK {studentId:${authUser.id}, count:${parentLinks.length}}`);

    return NextResponse.json({
      success: true,
      items: parentLinks,
      total: parentLinks.length,
    });
  } catch (error: unknown) {
    console.error("[GET /api/student/parents] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "STUDENT_PARENTS_LIST");
