import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentInvitationRepo } from "@/lib/repositories/parent-student-invitation-repo";
import { z } from "zod";

const listQuerySchema = z
  .object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

const createBodySchema = z
  .object({
    expiresInDays: z.coerce.number().int().min(1).max(365).optional(),
  })
  .passthrough();

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
    const parsedQuery = listQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || undefined,
      skip: searchParams.get("skip") || undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const status = parsedQuery.data.status;
    const limit = parsedQuery.data.limit ?? 20;
    const skip = parsedQuery.data.skip ?? 0;

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
  } catch (error: unknown) {
    console.error("[GET /api/student/invitations] Error:", error);
    return errorResponse(500, "Internal server error");
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

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = createBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const expiresInDays = parsedBody.data.expiresInDays;

    const invitation = await parentStudentInvitationRepo.create({
      studentId: authUser.id,
      expiresInDays: expiresInDays || 7,
    });

    return NextResponse.json({
      success: true,
      data: invitation,
      message: "Invitation created successfully",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/student/invitations] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "STUDENT_INVITATION_CREATE");
