import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";
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
    studentId: z.string().min(1).max(100),
    message: z.string().max(1000).optional().nullable(),
  })
  .passthrough();

/**
 * GET /api/parent/link-requests
 * Lấy danh sách link requests của phụ huynh (đã gửi)
 */
export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }
    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden: PARENT role only");
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

    const result = await parentStudentLinkRequestRepo.listByParent({
      parentId: authUser.id,
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
    console.error("[GET /api/parent/link-requests] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_LINK_REQUESTS_LIST");

/**
 * POST /api/parent/link-requests
 * Tạo link request mới đến học sinh
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
    const parsedBody = createBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Student ID is required");
    }

    const { studentId, message } = parsedBody.data;

    const linkRequest = await parentStudentLinkRequestRepo.create({
      parentId: authUser.id,
      studentId,
      message: message ?? undefined,
    });

    return NextResponse.json({
      success: true,
      data: linkRequest,
      message: "Link request sent successfully. Waiting for student approval.",
    }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/parent/link-requests] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_LINK_REQUEST_CREATE");
