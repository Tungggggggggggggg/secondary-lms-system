/**
 * API Endpoint cho Bulk Classroom Creation
 * POST /api/admin/bulk/classrooms - Tạo lớp học hàng loạt
 * GET /api/admin/bulk/classrooms/[operationId] - Lấy progress
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { BulkClassroomInput, BulkClassroomApiResponse } from "@/types/bulk-operations";
import { createBulkClassroom, cleanupProgress } from "@/lib/bulk-operations/bulk-processor";
import { validateBulkClassroom } from "@/lib/bulk-operations/validators";
import { writeAudit } from "@/lib/logging/audit";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isStaffRole, isSuperAdminRole } from "@/lib/rbac/policy";

// ============================================
// POST - Tạo lớp học hàng loạt
// ============================================

export const POST = withApiLogging(async (req: NextRequest) => {
  const startTime = Date.now();
  
  try {
    console.log('[BULK_CLASSROOMS_API] Starting bulk classroom creation request');

    // Authentication & Authorization
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    // Chỉ STAFF và SUPER_ADMIN được phép tạo bulk classroom
    if (!(isStaffRole(authUser.role) || isSuperAdminRole(authUser.role))) {
      console.warn(`[BULK_CLASSROOMS_API] Unauthorized role: ${authUser.role} for user: ${authUser.id}`);
      return errorResponse(403, "Chỉ Staff và Super Admin được phép tạo lớp học hàng loạt");
    }

    // Parse request body
    let body: BulkClassroomInput;
    try {
      body = await req.json();
      console.log('[BULK_CLASSROOMS_API] Request body:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('[BULK_CLASSROOMS_API] Invalid JSON body:', error);
      return errorResponse(400, "Invalid JSON body");
    }

    console.log(`[BULK_CLASSROOMS_API] Processing bulk classroom: ${body.name} with ${body.students?.length || 0} students`);

    // Validate input
    const validation = await validateBulkClassroom(body);
    if (!validation.isValid) {
      console.warn('[BULK_CLASSROOMS_API] Validation failed:', validation.errors);
      
      const response: BulkClassroomApiResponse = {
        success: false,
        errors: validation.errors.map(e => `Dòng ${e.row}: ${e.message}`),
        warnings: validation.warnings,
        meta: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          operationId: 'validation-failed'
        }
      };
      
      return NextResponse.json(response, { status: 400 });
    }

    // Generate operation ID
    const operationId = randomUUID();
    
    console.log(`[BULK_CLASSROOMS_API] Starting bulk operation: ${operationId}`);

    // Enforce organizationId for SUPER_ADMIN writes
    if (!body.organizationId && isSuperAdminRole(authUser.role)) {
      return errorResponse(400, "Vui lòng chọn Trường/Đơn vị trước khi thực hiện thao tác này (organizationId required)");
    }

    // Set organization ID từ user context nếu không có (STAFF)
    if (!body.organizationId && isStaffRole(authUser.role)) {
      // Lấy organization của admin
      const orgMember = await prisma?.organizationMember.findFirst({
        where: { userId: authUser.id },
        select: { organizationId: true }
      });
      
      if (orgMember) {
        body.organizationId = orgMember.organizationId;
      }
    }

    // Process bulk classroom creation
    const result = await createBulkClassroom(body, operationId);

    // Ghi audit log
    await writeAudit({
      actorId: authUser.id,
      action: 'BULK_CLASSROOM_CREATE',
      entityType: 'CLASSROOM',
      entityId: result.classroom?.id || 'failed',
      metadata: {
        classroomName: body.name,
        studentsCount: body.students?.length || 0,
        successCount: result.summary.successCount,
        errorCount: result.summary.errorCount,
        operationId,
        duration: result.summary.duration,
        organizationId: body.organizationId
      }
    });

    // Cleanup progress sau 1 giờ
    cleanupProgress(operationId);

    const response: BulkClassroomApiResponse = {
      success: result.success,
      data: result,
      errors: result.errors,
      warnings: result.warnings,
      meta: {
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        operationId
      }
    };

    const statusCode = result.success ? 201 : 400;
    
    console.log(`[BULK_CLASSROOMS_API] Bulk classroom creation completed: ${operationId}, success: ${result.success}`);
    
    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('[BULK_CLASSROOMS_API] Unexpected error:', error);

    // Ghi audit log cho lỗi
    try {
      const authUser = await getAuthenticatedUser(req);
      if (authUser) {
        await writeAudit({
          actorId: authUser.id,
          action: 'BULK_CLASSROOM_CREATE_ERROR',
          entityType: 'SYSTEM',
          entityId: 'bulk-error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          }
        });
      }
    } catch (auditError) {
      console.error('[BULK_CLASSROOMS_API] Error writing audit log:', auditError);
    }

    const response: BulkClassroomApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      meta: {
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        operationId: 'error'
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}, "BULK_CLASSROOM_CREATE");

// ============================================
// Validation Endpoint (Optional)
// ============================================

export const PUT = withApiLogging(async (req: NextRequest) => {
  try {
    console.log('[BULK_CLASSROOMS_API] Validation request');

    // Authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (!(isStaffRole(authUser.role) || isSuperAdminRole(authUser.role))) {
      return errorResponse(403, "Forbidden");
    }

    // Parse body
    const body: BulkClassroomInput = await req.json();

    // Validate
    const validation = await validateBulkClassroom(body);

    return NextResponse.json({
      success: true,
      data: validation,
      meta: {
        duration: 0,
        timestamp: new Date().toISOString(),
        operationId: 'validation-only'
      }
    });

  } catch (error) {
    console.error('[BULK_CLASSROOMS_API] Validation error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation error'
    }, { status: 400 });
  }
}, "BULK_CLASSROOM_VALIDATE");
