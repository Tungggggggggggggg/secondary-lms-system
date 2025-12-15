import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface ParentChildLinkRow {
  studentId: string;
  student: {
    id: string;
    email: string;
    fullname: string | null;
    role: string;
  };
}

interface ParentStatsSubmissionRow {
  id: string;
  grade: number | null;
  submittedAt: Date;
}

interface StudentClassroomRow {
  classroomId: string;
}

interface AssignmentClassroomRow {
  assignmentId: string;
}

interface UpcomingAssignmentRow {
  id: string;
}

/**
 * GET /api/parent/dashboard/stats
 * Lấy thống kê tổng quan cho parent dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden - Parent role required");
    }

    // Lấy danh sách tất cả con của phụ huynh
    const relationships = (await prisma.parentStudent.findMany({
      where: {
        parentId: authUser.id,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
    })) as ParentChildLinkRow[];

    const studentIds = relationships.map(
      (rel: ParentChildLinkRow) => rel.studentId,
    );
    const totalChildren = relationships.length;

    // Nếu không có con nào, trả về stats rỗng
    if (totalChildren === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalChildren: 0,
          totalSubmissions: 0,
          totalGraded: 0,
          totalPending: 0,
          overallAverage: 0,
          averageChange: 0,
        },
      });
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [totalSubmissions, totalGraded, overallAgg, lastMonthAgg] = await Promise.all([
      prisma.assignmentSubmission.count({
        where: {
          studentId: { in: studentIds },
        },
      }),

      prisma.assignmentSubmission.count({
        where: {
          studentId: { in: studentIds },
          grade: { not: null },
        },
      }),

      prisma.assignmentSubmission.aggregate({
        where: {
          studentId: { in: studentIds },
          grade: { not: null },
        },
        _avg: { grade: true },
      }),

      prisma.assignmentSubmission.aggregate({
        where: {
          studentId: { in: studentIds },
          grade: { not: null },
          submittedAt: {
            gte: twoMonthsAgo,
            lt: oneMonthAgo,
          },
        },
        _avg: { grade: true },
      }),
    ]);

    const totalPending = totalSubmissions - totalGraded;

    // Tính điểm trung bình tổng
    const overallAverage = Number(overallAgg._avg.grade ?? 0);

    // Tính điểm trung bình tháng trước để so sánh
    const lastMonthAverage = Number(lastMonthAgg._avg.grade ?? 0);

    const averageChange = overallAverage - lastMonthAverage;

    // Tính số assignments sắp đến hạn của tất cả con
    // Đếm theo cặp (studentId, assignmentId) để tránh sai số khi có nhiều con
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingAssignments = 0;

    if (studentIds.length > 0) {
      const [totalPairsRows, submittedPairsRows] = await Promise.all([
        prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*)::bigint as total
          FROM (
            SELECT DISTINCT cs."studentId", ac."assignmentId"
            FROM "classroom_students" cs
            JOIN "assignment_classrooms" ac ON ac."classroomId" = cs."classroomId"
            JOIN "assignments" a ON a."id" = ac."assignmentId"
            WHERE cs."studentId" = ANY(${studentIds}::text[])
              AND a."dueDate" IS NOT NULL
              AND a."dueDate" >= ${now}
              AND a."dueDate" <= ${sevenDaysFromNow}
          ) pairs;
        `,
        prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(*)::bigint as total
          FROM (
            SELECT DISTINCT s."studentId", s."assignmentId"
            FROM "assignment_submissions" s
            JOIN "assignments" a ON a."id" = s."assignmentId"
            WHERE s."studentId" = ANY(${studentIds}::text[])
              AND a."dueDate" IS NOT NULL
              AND a."dueDate" >= ${now}
              AND a."dueDate" <= ${sevenDaysFromNow}
          ) submitted;
        `,
      ]);

      const totalPairs = Number(totalPairsRows[0]?.total ?? 0);
      const submittedPairs = Number(submittedPairsRows[0]?.total ?? 0);
      upcomingAssignments = Math.max(0, totalPairs - submittedPairs);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalChildren,
        totalSubmissions,
        totalGraded,
        totalPending,
        overallAverage: Math.round(overallAverage * 10) / 10,
        averageChange: Math.round(averageChange * 10) / 10,
        upcomingAssignments,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/parent/dashboard/stats] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}

