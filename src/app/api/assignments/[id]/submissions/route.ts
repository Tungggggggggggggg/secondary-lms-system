import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

/**
 * GET /api/assignments/[id]/submissions
 * Lấy danh sách submissions cho assignment (teacher view)
 * OPTIMIZED: Filter (graded/ungraded/all), search, pagination
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;

    // Kiểm tra teacher có sở hữu assignment không
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    // Parse query params
    const url = req.url ? new URL(req.url, "http://localhost") : null;
    const status = url?.searchParams.get("status"); // "all" | "graded" | "ungraded"
    const search = url?.searchParams.get("search"); // Search theo tên học sinh
    const page = url?.searchParams.get("page")
      ? Number(url.searchParams.get("page"))
      : 1;
    const limit = url?.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : 50;
    const skip = (page - 1) * limit;

    // Xây dựng where clause
    const whereClause: any = {
      assignmentId,
    };

    // Filter theo status (graded/ungraded)
    if (status === "graded") {
      whereClause.grade = { not: null };
    } else if (status === "ungraded") {
      whereClause.grade = null;
    }

    // Search theo tên học sinh
    if (search && search.trim()) {
      whereClause.student = {
        OR: [
          { fullname: { contains: search.trim(), mode: "insensitive" } },
          { email: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    }

    // Parallel queries: Count và fetch submissions
    const [total, submissions] = await Promise.all([
      prisma.assignmentSubmission.count({
        where: whereClause,
      }),
      prisma.assignmentSubmission.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          grade: true,
          feedback: true,
          submittedAt: true,
          student: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    // Transform data
    const submissionsData = submissions.map((sub) => ({
      ...sub,
      submittedAt: sub.submittedAt.toISOString(),
    }));

    console.log(
      `[INFO] [GET] /api/assignments/${assignmentId}/submissions - Found ${submissionsData.length} submissions (total: ${total}, page: ${page})`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          submissions: submissionsData,
          total,
          page,
          limit,
          hasMore: skip + submissionsData.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/assignments/[id]/submissions - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

