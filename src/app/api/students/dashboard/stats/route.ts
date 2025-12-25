import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// Always compute fresh data; avoid any route caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/students/dashboard/stats
 * Lấy thống kê tổng quan cho student dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized");
    }

    if (user.role !== "STUDENT") {
      return errorResponse(403, "Forbidden - Student role required");
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalClassrooms,
      newClassroomsThisWeek,
      studentClassrooms,
      lastMonthAgg,
    ] = await Promise.all([
      // 1. Đếm số lớp học đã tham gia
      prisma.classroomStudent.count({ where: { studentId: user.id } }),

      // 2. Đếm số lớp mới trong tuần này
      prisma.classroomStudent.count({
        where: {
          studentId: user.id,
          joinedAt: { gte: oneWeekAgo },
        },
      }),

      // 3. Lấy classroomIds đã tham gia
      prisma.classroomStudent.findMany({
        where: { studentId: user.id },
        select: { classroomId: true },
      }),

      // 5. Tính điểm trung bình tháng trước để so sánh (aggregate)
      prisma.assignmentSubmission.aggregate({
        where: {
          studentId: user.id,
          grade: { not: null },
          submittedAt: {
            gte: twoMonthsAgo,
            lt: oneMonthAgo,
          },
        },
        _avg: { grade: true },
      }),
    ]);

    const classroomIds = studentClassrooms.map((sc: { classroomId: string }) => sc.classroomId);

    let totalAssignments = 0;
    let submittedAssignments = 0;
    let upcomingAssignments = 0;
    let averageGrade = 0;

    if (classroomIds.length > 0) {
      // Lấy tất cả assignments từ các lớp
      const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
        where: { classroomId: { in: classroomIds } },
        select: { assignmentId: true },
      });

      const assignmentIds = Array.from(
        new Set(assignmentClassrooms.map((ac: { assignmentId: string }) => ac.assignmentId))
      );

      if (assignmentIds.length > 0) {
        // Đếm tổng số assignments
        totalAssignments = assignmentIds.length;

        // Đếm số assignments đã nộp (distinct assignmentId, tránh đếm theo attempt)
        const submittedRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
          SELECT COUNT(DISTINCT s."assignmentId")::bigint as total
          FROM "assignment_submissions" s
          WHERE s."studentId" = ${user.id}
            AND s."assignmentId" = ANY(${assignmentIds}::text[]);
        `;
        submittedAssignments = Number(submittedRows[0]?.total ?? 0);

        // Tính điểm trung bình theo rule P2 + overdue missing (0), deadline hiệu lực = lockAt ?? dueDate
        const avgAggRows = await prisma.$queryRaw<Array<{ grade_sum: number; grade_count: bigint; missing_overdue: bigint }>>`
          WITH relevant_assignments AS (
            SELECT DISTINCT a."id", a."dueDate", a."lockAt"
            FROM "assignments" a
            JOIN "assignment_classrooms" ac ON ac."assignmentId" = a."id"
            WHERE ac."classroomId" = ANY(${classroomIds}::text[])
          ),
          latest_graded AS (
            SELECT DISTINCT ON (s."assignmentId")
              s."assignmentId",
              s."grade"
            FROM "assignment_submissions" s
            JOIN relevant_assignments ra ON ra."id" = s."assignmentId"
            WHERE s."studentId" = ${user.id}
              AND s."grade" IS NOT NULL
            ORDER BY s."assignmentId", s."attempt" DESC, s."submittedAt" DESC
          ),
          missing_overdue AS (
            SELECT COUNT(*)::bigint as total
            FROM relevant_assignments ra
            WHERE COALESCE(ra."lockAt", ra."dueDate") IS NOT NULL
              AND COALESCE(ra."lockAt", ra."dueDate") < ${now}
              AND NOT EXISTS (
                SELECT 1
                FROM "assignment_submissions" s
                WHERE s."assignmentId" = ra."id" AND s."studentId" = ${user.id}
              )
          )
          SELECT
            COALESCE(SUM(latest_graded."grade"), 0)::double precision as grade_sum,
            COUNT(*)::bigint as grade_count,
            (SELECT total FROM missing_overdue) as missing_overdue
          FROM latest_graded;
        `;

        const gradeSum = Number(avgAggRows[0]?.grade_sum ?? 0);
        const gradeCount = Number(avgAggRows[0]?.grade_count ?? 0);
        const missingOverdue = Number(avgAggRows[0]?.missing_overdue ?? 0);
        const denom = gradeCount + missingOverdue;
        averageGrade = denom > 0 ? gradeSum / denom : 0;

        // Đếm số assignments sắp đến hạn (trong 7 ngày tới) theo deadline hiệu lực
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingRows = await prisma.$queryRaw<Array<{ total: bigint; submitted: bigint }>>`
          WITH relevant_assignments AS (
            SELECT DISTINCT a."id", a."dueDate", a."lockAt"
            FROM "assignments" a
            JOIN "assignment_classrooms" ac ON ac."assignmentId" = a."id"
            WHERE ac."classroomId" = ANY(${classroomIds}::text[])
          ),
          upcoming AS (
            SELECT ra."id" as "assignmentId"
            FROM relevant_assignments ra
            WHERE COALESCE(ra."lockAt", ra."dueDate") IS NOT NULL
              AND COALESCE(ra."lockAt", ra."dueDate") >= ${now}
              AND COALESCE(ra."lockAt", ra."dueDate") <= ${sevenDaysFromNow}
          ),
          submitted AS (
            SELECT COUNT(DISTINCT s."assignmentId")::bigint as total
            FROM "assignment_submissions" s
            JOIN upcoming u ON u."assignmentId" = s."assignmentId"
            WHERE s."studentId" = ${user.id}
          )
          SELECT
            (SELECT COUNT(*)::bigint FROM upcoming) as total,
            (SELECT total FROM submitted) as submitted;
        `;

        const upcomingTotal = Number(upcomingRows[0]?.total ?? 0);
        const upcomingSubmitted = Number(upcomingRows[0]?.submitted ?? 0);
        upcomingAssignments = Math.max(0, upcomingTotal - upcomingSubmitted);
      }
    }
    const lastMonthAverage = Number(lastMonthAgg._avg.grade ?? 0);

    const gradeChange = averageGrade - lastMonthAverage;

    // 6. Đếm số bài học (lessons) từ các khóa học trong các lớp
    const coursesInClassrooms = await prisma.classroomCourse.findMany({
      where: { classroomId: { in: classroomIds } },
      select: { courseId: true },
    });

    const courseIds = coursesInClassrooms.map((cc: { courseId: string }) => cc.courseId);
    const [totalLessons, newLessonsThisWeek] =
      courseIds.length > 0
        ? await Promise.all([
            prisma.lesson.count({ where: { courseId: { in: courseIds } } }),
            prisma.lesson.count({
              where: {
                courseId: { in: courseIds },
                createdAt: { gte: oneWeekAgo },
              },
            }),
          ])
        : [0, 0];

    return NextResponse.json({
      success: true,
      data: {
        totalClassrooms,
        newClassroomsThisWeek,
        totalAssignments,
        submittedAssignments,
        upcomingAssignments,
        averageGrade: Math.round(averageGrade * 10) / 10,
        gradeChange: Math.round(gradeChange * 10) / 10,
        totalLessons,
        newLessonsThisWeek,
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/students/dashboard/stats] Error:", error);
    return errorResponse(500, "Internal server error");
  }
}

