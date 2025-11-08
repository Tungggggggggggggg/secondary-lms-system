import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";
import { parsePagination } from "@/lib/http/pagination";
import { parentStudentRepo } from "@/lib/repositories/parent-student-repo";

// GET /api/admin/parent-students
// Lấy danh sách liên kết phụ huynh-học sinh
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN or ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });
  const search = searchParams.get("search")?.trim();
  const parentId = searchParams.get("parentId")?.trim();
  const studentId = searchParams.get("studentId")?.trim();

  try {
    const result = await parentStudentRepo.list({
      search: search || null,
      limit: take,
      skip,
      parentId: parentId || null,
      studentId: studentId || null,
    });

    // Ensure we return real data from database, never mock data
    return NextResponse.json({
      success: true,
      items: result.items || [],
      total: result.total || 0,
    });
  } catch (error: any) {
    console.error("[GET /api/admin/parent-students] Error:", error);
    // Return empty array on error, not mock data
    if (error.message?.includes("parentStudent") || error.message?.includes("does not exist")) {
      console.error("[GET /api/admin/parent-students] Prisma model not found. Please run: npx prisma generate");
      return errorResponse(500, "Database schema not up to date. Please run: npx prisma generate");
    }
    return errorResponse(500, error.message || "Internal server error");
  }
}, "ADMIN_PARENT_STUDENTS_LIST");

// POST /api/admin/parent-students
// Tạo liên kết phụ huynh-học sinh mới
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN or ADMIN only");
  }

  let body: { parentId?: string; studentId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { parentId, studentId } = body;
  if (!parentId || !studentId) {
    return errorResponse(400, "parentId and studentId are required");
  }

  try {
    const created = await parentStudentRepo.create({
      parentId,
      studentId,
    });

    // Get client info for audit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    await writeAudit({
      actorId: authUser.id,
      action: "PARENT_STUDENT_CREATE",
      entityType: "PARENT_STUDENT",
      entityId: created.id,
      metadata: {
        parentId,
        studentId,
        parentEmail: created.parent.email,
        studentEmail: created.student.email,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/admin/parent-students] Error:", error);
    if (error.message.includes("already exists")) {
      return errorResponse(409, error.message);
    }
    if (error.message.includes("must have role")) {
      return errorResponse(400, error.message);
    }
    return errorResponse(500, error.message || "Internal server error");
  }
}, "ADMIN_PARENT_STUDENTS_CREATE");

