import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";

/**
 * GET /api/student/link-requests
 * Lấy danh sách link requests mà học sinh nhận được từ phụ huynh
 */
export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden: STUDENT role only");
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    const result = await parentStudentLinkRequestRepo.listByStudent({
      studentId: authUser.id,
      status: status || undefined,
      limit,
      skip,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
    });
  } catch (error: any) {
    console.error("[GET /api/student/link-requests] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "STUDENT_LINK_REQUESTS_LIST");
