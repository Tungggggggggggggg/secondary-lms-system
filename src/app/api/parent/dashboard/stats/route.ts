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

    const [pairsAggRows, lastMonthAgg] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          total_pairs: bigint;
          submitted_pairs: bigint;
          grade_sum: number;
          grade_count: bigint;
          missing_overdue: bigint;
        }>
      >`
        WITH pairs AS (
          SELECT DISTINCT cs."studentId", ac."assignmentId"
          FROM "classroom_students" cs
          JOIN "assignment_classrooms" ac ON ac."classroomId" = cs."classroomId"
          WHERE cs."studentId" = ANY(${studentIds}::text[])
        ),
        submitted_pairs AS (
          SELECT DISTINCT s."studentId", s."assignmentId"
          FROM "assignment_submissions" s
          JOIN pairs p ON p."studentId" = s."studentId" AND p."assignmentId" = s."assignmentId"
        ),
        latest_graded AS (
          SELECT DISTINCT ON (s."studentId", s."assignmentId")
            s."studentId",
            s."assignmentId",
            s."grade"
          FROM "assignment_submissions" s
          JOIN pairs p ON p."studentId" = s."studentId" AND p."assignmentId" = s."assignmentId"
          WHERE s."grade" IS NOT NULL
          ORDER BY s."studentId", s."assignmentId", s."attempt" DESC, s."submittedAt" DESC
        ),
        missing_overdue AS (
          SELECT COUNT(*)::bigint as total
          FROM pairs p
          JOIN "assignments" a ON a."id" = p."assignmentId"
          WHERE COALESCE(a."lockAt", a."dueDate") IS NOT NULL
            AND COALESCE(a."lockAt", a."dueDate") < ${now}
            AND NOT EXISTS (
              SELECT 1
              FROM "assignment_submissions" s
              WHERE s."studentId" = p."studentId" AND s."assignmentId" = p."assignmentId"
            )
        )
        SELECT
          (SELECT COUNT(*)::bigint FROM pairs) as total_pairs,
          (SELECT COUNT(*)::bigint FROM submitted_pairs) as submitted_pairs,
          COALESCE(SUM(lg."grade"), 0)::double precision as grade_sum,
          COUNT(lg."assignmentId")::bigint as grade_count,
          (SELECT total FROM missing_overdue) as missing_overdue
        FROM (SELECT 1) dummy
        LEFT JOIN latest_graded lg ON true;
      `,
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

    const totalPairs = Number(pairsAggRows[0]?.total_pairs ?? 0);
    const totalSubmissions = Number(pairsAggRows[0]?.submitted_pairs ?? 0);
    const gradedSum = Number(pairsAggRows[0]?.grade_sum ?? 0);
    const gradedCount = Number(pairsAggRows[0]?.grade_count ?? 0);
    const missingOverdue = Number(pairsAggRows[0]?.missing_overdue ?? 0);
    const denom = gradedCount + missingOverdue;

    const totalGraded = denom;
    const totalPending = Math.max(0, totalPairs - totalGraded);

    const overallAverage = denom > 0 ? gradedSum / denom : 0;

    // Tính điểm trung bình tháng trước để so sánh (giữ logic cũ theo graded submissions)
    const lastMonthAverage = Number(lastMonthAgg._avg.grade ?? 0);

    const averageChange = overallAverage - lastMonthAverage;

    // Tính số assignments sắp đến hạn của tất cả con (theo deadline hiệu lực)
    // Đếm theo cặp (studentId, assignmentId) để tránh sai số khi có nhiều con
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let upcomingAssignments = 0;

    if (studentIds.length > 0) {
      const upcomingRows = await prisma.$queryRaw<Array<{ total: bigint; submitted: bigint }>>`
        WITH pairs AS (
          SELECT DISTINCT cs."studentId", ac."assignmentId"
          FROM "classroom_students" cs
          JOIN "assignment_classrooms" ac ON ac."classroomId" = cs."classroomId"
          WHERE cs."studentId" = ANY(${studentIds}::text[])
        ),
        upcoming AS (
          SELECT DISTINCT p."studentId", p."assignmentId"
          FROM pairs p
          JOIN "assignments" a ON a."id" = p."assignmentId"
          WHERE COALESCE(a."lockAt", a."dueDate") IS NOT NULL
            AND COALESCE(a."lockAt", a."dueDate") >= ${now}
            AND COALESCE(a."lockAt", a."dueDate") <= ${sevenDaysFromNow}
        ),
        submitted AS (
          SELECT COUNT(*)::bigint as total
          FROM (
            SELECT DISTINCT s."studentId", s."assignmentId"
            FROM "assignment_submissions" s
            JOIN upcoming u ON u."studentId" = s."studentId" AND u."assignmentId" = s."assignmentId"
          ) t
        )
        SELECT
          (SELECT COUNT(*)::bigint FROM upcoming) as total,
          (SELECT total FROM submitted) as submitted;
      `;

      const totalUpcoming = Number(upcomingRows[0]?.total ?? 0);
      const submittedUpcoming = Number(upcomingRows[0]?.submitted ?? 0);
      upcomingAssignments = Math.max(0, totalUpcoming - submittedUpcoming);
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

