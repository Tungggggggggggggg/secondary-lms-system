import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";

/**
 * POST /api/student/link-requests/[id]/reject
 * Học sinh reject link request từ phụ huynh
 */
export const POST = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden: STUDENT role only");
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    await parentStudentLinkRequestRepo.reject({
      requestId: id,
      studentId: authUser.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Link request rejected successfully.",
    });
  } catch (error: unknown) {
    console.error("[POST /api/student/link-requests/[id]/reject] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "STUDENT_LINK_REQUEST_REJECT");
