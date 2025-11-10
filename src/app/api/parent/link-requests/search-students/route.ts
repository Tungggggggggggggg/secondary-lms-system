import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/parent/link-requests/search-students
 * Tìm kiếm học sinh để gửi link request
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
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    // Build search conditions
    const where: any = {
      role: "STUDENT",
      OR: [
        { fullname: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    };

    // Tìm học sinh
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        select: {
          id: true,
          email: true,
          fullname: true,
          // Lấy thông tin lớp học
          studentClassrooms: {
            take: 3,
            select: {
              classroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { fullname: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    // Kiểm tra xem đã có link hoặc request chưa
    const studentIds = students.map((s: any) => s.id);
    
    const [existingLinks, existingRequests] = await Promise.all([
      prisma.parentStudent.findMany({
        where: {
          parentId: authUser.id,
          studentId: { in: studentIds },
        },
        select: { studentId: true },
      }),
      prisma.parentStudentLinkRequest.findMany({
        where: {
          parentId: authUser.id,
          studentId: { in: studentIds },
          status: "PENDING",
        },
        select: { studentId: true },
      }),
    ]);

    const linkedStudentIds = new Set(existingLinks.map((l: any) => l.studentId));
    const requestedStudentIds = new Set(existingRequests.map((r: any) => r.studentId));

    // Format kết quả
    const results = students.map((student: any) => ({
      id: student.id,
      email: student.email,
      fullname: student.fullname,
      role: student.role,
      classrooms: student.studentClassrooms.map((sc: any) => sc.classroom),
      isLinked: linkedStudentIds.has(student.id),
      hasExistingRequest: requestedStudentIds.has(student.id),
    }));

    return NextResponse.json({
      success: true,
      items: results,
      total,
    });
  } catch (error: any) {
    console.error("[GET /api/parent/link-requests/search-students] Error:", error);
    return errorResponse(500, error.message || "Internal server error");
  }
}, "PARENT_SEARCH_STUDENTS");
