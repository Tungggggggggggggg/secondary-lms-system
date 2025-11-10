import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";

/**
 * DELETE /api/parent/link-requests/[id]
 * Phụ huynh hủy link request
 */
export const DELETE = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden: PARENT role only");
    }

    const { id } = params;

    await parentStudentLinkRequestRepo.cancel({
      requestId: id,
      parentId: authUser.id,
    });

    return NextResponse.json({
      success: true,
      message: "Link request cancelled successfully.",
    });
  } catch (error: any) {
    console.error("[DELETE /api/parent/link-requests/[id]] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "PARENT_LINK_REQUEST_CANCEL");
