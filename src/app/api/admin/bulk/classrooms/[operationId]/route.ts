/**
 * API Endpoint cho Progress Tracking
 * GET /api/admin/bulk/classrooms/[operationId] - Lấy progress của bulk operation
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { BulkProgressApiResponse } from "@/types/bulk-operations";
import { getProgress } from "@/lib/bulk-operations/bulk-processor";

// ============================================
// GET - Lấy progress của bulk operation
// ============================================

export const GET = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { operationId: string } }
) => {
  try {
    console.log(`[BULK_PROGRESS_API] Getting progress for operation: ${params.operationId}`);

    // Authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    // Chỉ ADMIN (STAFF) và SUPER_ADMIN được phép xem progress
    if (!['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Forbidden");
    }

    // Validate operation ID
    if (!params.operationId || params.operationId.length < 10) {
      return errorResponse(400, "Invalid operation ID");
    }

    // Lấy progress
    const progress = getProgress(params.operationId);
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        error: "Operation not found or expired",
        meta: {
          duration: 0,
          timestamp: new Date().toISOString(),
          operationId: params.operationId
        }
      }, { status: 404 });
    }

    const response: BulkProgressApiResponse = {
      success: true,
      data: progress,
      meta: {
        duration: 0,
        timestamp: new Date().toISOString(),
        operationId: params.operationId
      }
    };

    console.log(`[BULK_PROGRESS_API] Progress retrieved: ${progress.status} - ${progress.progress.percentage}%`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[BULK_PROGRESS_API] Error getting progress:', error);

    const response: BulkProgressApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      meta: {
        duration: 0,
        timestamp: new Date().toISOString(),
        operationId: params.operationId
      }
    };

    return NextResponse.json(response, { status: 500 });
  }
}, "BULK_PROGRESS_GET");
