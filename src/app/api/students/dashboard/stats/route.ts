import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
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
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Student role required" },
        { status: 403 }
      );
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalClassrooms,
      newClassroomsThisWeek,
      studentClassrooms,
      gradedAgg,
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

      // 4. Tính điểm trung bình từ các submissions đã được chấm (aggregate để giảm dữ liệu)
      prisma.assignmentSubmission.aggregate({
        where: {
          studentId: user.id,
          grade: { not: null },
        },
        _avg: { grade: true },
        _count: { _all: true },
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

    if (classroomIds.length > 0) {
      // Lấy tất cả assignments từ các lớp
      const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
        where: { classroomId: { in: classroomIds } },
        select: { assignmentId: true },
      });

      const assignmentIds = assignmentClassrooms.map(
        (ac: { assignmentId: string }) => ac.assignmentId,
      );

      if (assignmentIds.length > 0) {
        // Đếm tổng số assignments
        totalAssignments = assignmentIds.length;

        // Đếm số assignments đã nộp
        submittedAssignments = await prisma.assignmentSubmission.count({
          where: {
            assignmentId: { in: assignmentIds },
            studentId: user.id,
          },
        });

        // Đếm số assignments sắp đến hạn (trong 7 ngày tới)
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingAssignmentsData = await prisma.assignment.findMany({
          where: {
            id: { in: assignmentIds },
            dueDate: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
          select: { id: true },
        });

        // Kiểm tra xem học sinh đã nộp chưa
        const upcomingIds = upcomingAssignmentsData.map(
          (a: { id: string }) => a.id,
        );
        if (upcomingIds.length > 0) {
          const submittedUpcoming = await prisma.assignmentSubmission.count({
            where: {
              assignmentId: { in: upcomingIds },
              studentId: user.id,
            },
          });
          upcomingAssignments = upcomingIds.length - submittedUpcoming;
        }
      }
    }

    const averageGrade = gradedAgg._count._all > 0 ? Number(gradedAgg._avg.grade ?? 0) : 0;
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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

