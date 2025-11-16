import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentRepo } from "@/lib/repositories/parent-student-repo";

// GET /api/parent/children
// Lấy danh sách học sinh (con) của phụ huynh hiện tại
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "PARENT") {
    return errorResponse(403, "Forbidden: PARENT role only");
  }

  try {
    const relationships = await parentStudentRepo.getByParentId(authUser.id);

    return NextResponse.json({
      success: true,
      items: relationships || [],
      total: relationships?.length || 0,
    });
  } catch (error: unknown) {
    console.error("[GET /api/parent/children] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "PARENT_CHILDREN_LIST");

