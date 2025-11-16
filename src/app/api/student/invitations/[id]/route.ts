import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentInvitationRepo } from "@/lib/repositories/parent-student-invitation-repo";

/**
 * DELETE /api/student/invitations/[id]
 * Hủy invitation
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
    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden: STUDENT role only");
    }

    const { id } = params;

    await parentStudentInvitationRepo.cancel({
      id,
      studentId: authUser.id,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error: unknown) {
    console.error("[DELETE /api/student/invitations/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "STUDENT_INVITATION_CANCEL");
