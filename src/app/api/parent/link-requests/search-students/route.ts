import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z
  .object({
    q: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    skip: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

interface ParentSearchStudentClassroomRow {
  classroom: {
    id: string;
    name: string;
  };
}

interface ParentSearchStudentRow {
  id: string;
  email: string;
  fullname: string | null;
  role: string;
  studentClassrooms: ParentSearchStudentClassroomRow[];
}

interface ParentStudentLinkRow {
  studentId: string;
}

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
    const parsedQuery = querySchema.safeParse({
      q: searchParams.get("q") || undefined,
      limit: searchParams.get("limit") || undefined,
      skip: searchParams.get("skip") || undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const query = parsedQuery.data.q ?? "";
    const limit = parsedQuery.data.limit ?? 20;
    const skip = parsedQuery.data.skip ?? 0;

    // Build search conditions
    const where = {
      role: "STUDENT" as const,
      OR: [
        { fullname: { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ],
    };

    // Tìm học sinh
    const [studentsRaw, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        select: {
          id: true,
          email: true,
          fullname: true,
          role: true,
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
    const studentIds = studentsRaw.map((s) => s.id);
    
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

    const linkedStudentIds = new Set(
      (existingLinks as ParentStudentLinkRow[]).map(
        (l: ParentStudentLinkRow) => l.studentId,
      ),
    );
    const requestedStudentIds = new Set(
      (existingRequests as ParentStudentLinkRow[]).map(
        (r: ParentStudentLinkRow) => r.studentId,
      ),
    );

    // Format kết quả
    const results = studentsRaw.map((student) => ({
      id: student.id,
      email: student.email,
      fullname: student.fullname,
      role: student.role,
      classrooms: student.studentClassrooms.map(
        (sc: ParentSearchStudentClassroomRow) => sc.classroom,
      ),
      isLinked: linkedStudentIds.has(student.id),
      hasExistingRequest: requestedStudentIds.has(student.id),
    }));

    return NextResponse.json({
      success: true,
      items: results,
      total,
    });
  } catch (error: unknown) {
    console.error("[GET /api/parent/link-requests/search-students] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_SEARCH_STUDENTS");
