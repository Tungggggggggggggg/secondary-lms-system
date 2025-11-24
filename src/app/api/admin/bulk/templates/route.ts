/**
 * API Endpoint cho CSV Templates
 * GET /api/admin/bulk/templates - Download CSV templates
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { 
  generateStudentCSVTemplate, 
  generateTeacherCSVTemplate 
} from "@/lib/bulk-operations/csv-parser";

// ============================================
// GET - Download CSV Templates
// ============================================

export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    console.log('[BULK_TEMPLATES_API] CSV template download request');

    // Authentication
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    // Chỉ ADMIN (STAFF) và SUPER_ADMIN được phép download templates
    if (!['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Forbidden");
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'student';
    const includeExample = searchParams.get('example') !== 'false';

    let csvContent: string;
    let filename: string;

    switch (type.toLowerCase()) {
      case 'student':
        csvContent = generateStudentCSVTemplate(includeExample);
        filename = 'student-template.csv';
        break;
      case 'teacher':
        csvContent = generateTeacherCSVTemplate(includeExample);
        filename = 'teacher-template.csv';
        break;
      default:
        return errorResponse(400, "Invalid template type. Use 'student' or 'teacher'");
    }

    console.log(`[BULK_TEMPLATES_API] Generated ${type} template, size: ${csvContent.length} chars`);

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[BULK_TEMPLATES_API] Error generating template:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}, "BULK_TEMPLATE_DOWNLOAD");
