import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";
import { parentStudentRepo } from "@/lib/repositories/parent-student-repo";

// PATCH /api/admin/parent-students/[id]
// Cập nhật liên kết phụ huynh-học sinh
export const PATCH = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN or ADMIN only");
  }

  const { id } = params;

  let body: { parentId?: string; studentId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { parentId, studentId } = body;

  // Both fields are optional, but at least one must be provided to update
  if (!parentId && !studentId) {
    return errorResponse(400, "At least one of parentId or studentId must be provided");
  }

  try {
    // Get the relationship before updating for audit
    const oldRelationship = await parentStudentRepo.getById(id);
    if (!oldRelationship) {
      return errorResponse(404, "Parent-student relationship not found");
    }

    const updated = await parentStudentRepo.update(id, {
      parentId: parentId || undefined,
      studentId: studentId || undefined,
    });

    // Get client info for audit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    await writeAudit({
      actorId: authUser.id,
      action: "PARENT_STUDENT_UPDATE",
      entityType: "PARENT_STUDENT",
      entityId: id,
      metadata: {
        oldParentId: oldRelationship.parentId,
        oldStudentId: oldRelationship.studentId,
        newParentId: updated.parentId,
        newStudentId: updated.studentId,
        oldParentEmail: oldRelationship.parent.email,
        oldStudentEmail: oldRelationship.student.email,
        newParentEmail: updated.parent.email,
        newStudentEmail: updated.student.email,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/admin/parent-students/:id] Error:", error);
    if (error.message.includes("not found")) {
      return errorResponse(404, error.message);
    }
    if (error.message.includes("already exists")) {
      return errorResponse(409, error.message);
    }
    if (error.message.includes("must have role")) {
      return errorResponse(400, error.message);
    }
    return errorResponse(500, error.message || "Internal server error");
  }
}, "ADMIN_PARENT_STUDENTS_UPDATE");

// DELETE /api/admin/parent-students/[id]
// Xóa liên kết phụ huynh-học sinh
export const DELETE = withApiLogging(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: SUPER_ADMIN or ADMIN only");
  }

  const { id } = params;

  try {
    // Get the relationship before deleting for audit
    const relationship = await parentStudentRepo.getById(id);
    if (!relationship) {
      return errorResponse(404, "Parent-student relationship not found");
    }

    await parentStudentRepo.delete(id);

    // Get client info for audit
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    await writeAudit({
      actorId: authUser.id,
      action: "PARENT_STUDENT_DELETE",
      entityType: "PARENT_STUDENT",
      entityId: id,
      metadata: {
        parentId: relationship.parentId,
        studentId: relationship.studentId,
        parentEmail: relationship.parent.email,
        studentEmail: relationship.student.email,
      },
      ip,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/parent-students/:id] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "ADMIN_PARENT_STUDENTS_DELETE");

