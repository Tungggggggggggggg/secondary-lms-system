import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentInvitationRepo } from "@/lib/repositories/parent-student-invitation-repo";
import { z } from "zod";

const bodySchema = z
  .object({
    code: z.string().min(1).max(200),
  })
  .passthrough();

/**
 * POST /api/parent/invitations/accept
 * Phụ huynh accept invitation code
 */
export const POST = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden: PARENT role only");
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Invitation code is required");
    }

    const code = parsedBody.data.code;

    const result = await parentStudentInvitationRepo.acceptInvitation({
      code: code.toUpperCase().trim(),
      parentId: authUser.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Invitation accepted successfully. You are now linked with the student.",
    });
  } catch (error: unknown) {
    console.error("[POST /api/parent/invitations/accept] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_INVITATION_ACCEPT");
