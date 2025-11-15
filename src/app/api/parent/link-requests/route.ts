import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { parentStudentLinkRequestRepo } from "@/lib/repositories/parent-student-link-request-repo";

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
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | null;
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

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
  } catch (error: any) {
    console.error("[GET /api/parent/link-requests] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
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

    const body = await req.json();
    const { studentId, message } = body;

    if (!studentId) {
      return errorResponse(400, "Student ID is required");
    }

    const linkRequest = await parentStudentLinkRequestRepo.create({
      parentId: authUser.id,
      studentId,
      message,
    });

    return NextResponse.json({
      success: true,
      data: linkRequest,
      message: "Link request sent successfully. Waiting for student approval.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/parent/link-requests] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "PARENT_LINK_REQUEST_CREATE");
