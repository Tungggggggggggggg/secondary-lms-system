/**
 * Admin Classrooms API
 * API để quản lý danh sách lớp học và thông tin học sinh
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// ============================================
// GET - Lấy danh sách lớp học
// ============================================

export async function GET(req: NextRequest) {
  try {
    // Authentication & Authorization
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    // Chỉ ADMIN và SUPER_ADMIN được phép xem danh sách lớp học
    if (!['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Chỉ Admin được phép xem danh sách lớp học");
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    // Build where clause
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { teacher: { fullname: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Fetch classrooms with related data
    const [classrooms, totalCount] = await Promise.all([
      prisma.classroom.findMany({
        where: whereClause,
        include: {
          teacher: {
            select: {
              id: true,
              fullname: true,
              email: true
            }
          },
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  role: true
                }
              }
            },
            orderBy: {
              joinedAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.classroom.count({ where: whereClause })
    ]);

    // Calculate statistics
    const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom.students.length, 0);
    const totalTeachers = new Set(classrooms.map(c => c.teacherId)).size;

    console.log(`[ADMIN_CLASSROOMS_API] Retrieved ${classrooms.length} classrooms for user: ${authUser.id}`);

    return NextResponse.json({
      success: true,
      classrooms,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics: {
        totalClassrooms: totalCount,
        totalStudents,
        totalTeachers
      }
    });

  } catch (error) {
    console.error('[ADMIN_CLASSROOMS_API] Error:', error);
    return errorResponse(500, "Lỗi server khi lấy danh sách lớp học");
  }
}

// ============================================
// POST - Tạo lớp học mới (redirect to bulk)
// ============================================

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
      return errorResponse(403, "Chỉ Admin được phép tạo lớp học");
    }

    // Redirect to bulk creation endpoint
    return NextResponse.json({
      success: true,
      message: "Vui lòng sử dụng bulk creation endpoint",
      redirectTo: "/api/admin/bulk/classrooms"
    });

  } catch (error) {
    console.error('[ADMIN_CLASSROOMS_API] Error:', error);
    return errorResponse(500, "Lỗi server");
  }
}
