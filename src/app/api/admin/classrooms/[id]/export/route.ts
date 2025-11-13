/**
 * Classroom Students Export API
 * API để xuất danh sách học sinh ra file CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// ============================================
// GET - Xuất danh sách học sinh CSV
// ============================================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication & Authorization
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    // Chỉ ADMIN và SUPER_ADMIN được phép xuất danh sách
    if (!['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Chỉ Admin được phép xuất danh sách học sinh");
    }

    const classroomId = params.id;

    // Fetch classroom with students
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teacher: {
          select: {
            fullname: true,
            email: true
          }
        },
        students: {
          include: {
            student: {
              select: {
                fullname: true,
                email: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        }
      }
    });

    if (!classroom) {
      return errorResponse(404, "Không tìm thấy lớp học");
    }

    // Generate CSV content
    const csvHeaders = [
      'STT',
      'Họ và tên',
      'Email',
      'Ngày tham gia lớp',
      'Ngày tạo tài khoản'
    ];

    const csvRows = classroom.students.map((cs, index) => [
      (index + 1).toString(),
      `"${cs.student.fullname}"`,
      cs.student.email,
      new Date(cs.joinedAt).toLocaleDateString('vi-VN'),
      new Date(cs.student.createdAt).toLocaleDateString('vi-VN')
    ]);

    // Add header row
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const csvWithBOM = '\uFEFF' + csvContent;

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${classroom.code}_students_${timestamp}.csv`;

    console.log(`[CLASSROOM_EXPORT_API] Exported ${classroom.students.length} students from classroom ${classroomId} by user: ${authUser.id}`);

    // Return CSV file
    return new NextResponse(csvWithBOM, {
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
    console.error('[CLASSROOM_EXPORT_API] Error:', error);
    return errorResponse(500, "Lỗi server khi xuất danh sách học sinh");
  }
}
