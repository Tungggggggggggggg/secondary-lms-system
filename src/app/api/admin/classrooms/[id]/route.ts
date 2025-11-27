/**
 * Admin Classroom Detail API
 * API để lấy chi tiết lớp học và danh sách học sinh
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { resolveOrgId } from "@/lib/org-scope";

// ============================================
// GET - Lấy chi tiết lớp học
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

    // Chỉ ADMIN (STAFF) và SUPER_ADMIN được phép xem chi tiết lớp học
    if (!['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Chỉ Admin được phép xem chi tiết lớp học");
    }

    const classroomId = params.id;

    // Fetch classroom with detailed information
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        teacher: {
          select: {
            id: true,
            fullname: true,
            email: true,
            role: true
          }
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullname: true,
                email: true,
                role: true,
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

    // Format response data
    interface ClassroomStudentRow {
      id: string;
      joinedAt: Date | string;
      student: {
        id: string;
        fullname: string;
        email: string;
        role: string;
        createdAt: Date | string;
      };
    }

    const formattedClassroom = {
      ...classroom,
      studentsCount: classroom.students.length,
      students: classroom.students.map((cs: ClassroomStudentRow, index: number) => ({
        id: cs.student.id,
        stt: index + 1,
        fullname: cs.student.fullname,
        email: cs.student.email,
        role: cs.student.role,
        joinedAt: cs.joinedAt,
        createdAt: cs.student.createdAt,
        classroomStudentId: cs.id
      }))
    };

    console.log(`[ADMIN_CLASSROOM_DETAIL_API] Retrieved classroom ${classroomId} with ${classroom.students.length} students for user: ${authUser.id}`);

    return NextResponse.json({
      success: true,
      classroom: formattedClassroom
    });

  } catch (error) {
    console.error('[ADMIN_CLASSROOM_DETAIL_API] Error:', error);
    return errorResponse(500, "Lỗi server khi lấy chi tiết lớp học");
  }
}

// ============================================
// DELETE - Xóa học sinh khỏi lớp hoặc xóa lớp học
// ============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (!['ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Chỉ Admin được phép thực hiện thao tác này");
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const deleteClassroom = searchParams.get('deleteClassroom') === 'true';
    const classroomId = params.id;

    // Với SUPER_ADMIN: bắt buộc chọn org và phải khớp với lớp học
    if (authUser.role === 'SUPER_ADMIN') {
      const selectedOrg = resolveOrgId(req);
      if (!selectedOrg) {
        return errorResponse(400, "Vui lòng chọn Trường/Đơn vị trước khi thực hiện thao tác này");
      }
      const clsOrg = await prisma.classroom.findUnique({ where: { id: classroomId }, select: { organizationId: true } });
      if (clsOrg?.organizationId && clsOrg.organizationId !== selectedOrg) {
        return errorResponse(400, "Phạm vi Trường/Đơn vị không khớp với lớp học");
      }
    }

    if (deleteClassroom) {
      // Xóa toàn bộ lớp học
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        include: { students: true }
      });

      if (!classroom) {
        return errorResponse(404, "Không tìm thấy lớp học");
      }

      // Xóa trong transaction
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Xóa tất cả học sinh khỏi lớp
        await tx.classroomStudent.deleteMany({
          where: { classroomId: classroomId }
        });

        // Xóa lớp học
        await tx.classroom.delete({
          where: { id: classroomId }
        });
      });

      console.log(`[ADMIN_CLASSROOM_DETAIL_API] Deleted classroom ${classroomId} by user: ${authUser.id}`);

      return NextResponse.json({
        success: true,
        message: "Đã xóa lớp học thành công"
      });

    } else if (studentId) {
      // Xóa học sinh khỏi lớp
      const deletedRelation = await prisma.classroomStudent.deleteMany({
        where: {
          classroomId: classroomId,
          studentId: studentId
        }
      });

      if (deletedRelation.count === 0) {
        return errorResponse(404, "Không tìm thấy học sinh trong lớp học này");
      }

      console.log(`[ADMIN_CLASSROOM_DETAIL_API] Removed student ${studentId} from classroom ${classroomId} by user: ${authUser.id}`);

      return NextResponse.json({
        success: true,
        message: "Đã xóa học sinh khỏi lớp học"
      });

    } else {
      return errorResponse(400, "Thiếu tham số studentId hoặc deleteClassroom");
    }

  } catch (error) {
    console.error('[ADMIN_CLASSROOM_DETAIL_API] Error in delete operation:', error);
    return errorResponse(500, "Lỗi server khi thực hiện thao tác xóa");
  }
}
