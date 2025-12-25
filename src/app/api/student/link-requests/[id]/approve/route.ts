import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";

/**
 * POST /api/student/link-requests/[id]/approve
 * Học sinh approve link request từ phụ huynh
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

    const result = await parentStudentLinkRequestRepo.approve({
      requestId: id,
      studentId: authUser.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Link request approved successfully. You are now linked with the parent.",
    });
  } catch (error: unknown) {
    console.error("[POST /api/student/link-requests/[id]/approve] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "STUDENT_LINK_REQUEST_APPROVE");
