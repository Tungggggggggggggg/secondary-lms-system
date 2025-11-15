import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentInvitationRepo } from "@/lib/repositories/parent-student-invitation-repo";

/**
 * GET /api/student/invitations
 * Lấy danh sách invitations của học sinh hiện tại
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

    const result = await parentStudentInvitationRepo.listByStudent({
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
    console.error("[GET /api/student/invitations] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "STUDENT_INVITATIONS_LIST");

/**
 * POST /api/student/invitations
 * Tạo invitation code mới
 */
export const POST = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden: STUDENT role only");
    }

    const body = await req.json();
    const { parentEmail, parentPhone, expiresInDays } = body;

    const invitation = await parentStudentInvitationRepo.create({
      studentId: authUser.id,
      expiresInDays: expiresInDays || 7,
    });

    return NextResponse.json({
      success: true,
      data: invitation,
      message: "Invitation created successfully",
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/student/invitations] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "STUDENT_INVITATION_CREATE");
