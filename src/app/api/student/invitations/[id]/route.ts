import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentInvitationRepo } from "@/lib/repositories/parent-student-invitation-repo";
import { z } from "zod";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

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

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const { id } = parsedParams.data;

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
    return errorResponse(500, "Internal server error");
  }
}, "STUDENT_INVITATION_CANCEL");
