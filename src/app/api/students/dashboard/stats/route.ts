import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/students/dashboard/stats
 * Lấy thống kê tổng quan cho student dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, UserRole.STUDENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Đếm số lớp học đã tham gia
    const totalClassrooms = await prisma.classroomStudent.count({
      where: { studentId: user.id },
    });

    // 2. Đếm số lớp mới trong tuần này
    const newClassroomsThisWeek = await prisma.classroomStudent.count({
      where: {
        studentId: user.id,
        joinedAt: { gte: oneWeekAgo },
      },
    });

    // 3. Lấy tất cả assignments từ các lớp đã tham gia
    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      select: { classroomId: true },
    });

    const classroomIds = studentClassrooms.map((sc) => sc.classroomId);

    let totalAssignments = 0;
    let submittedAssignments = 0;
    let upcomingAssignments = 0;

    if (classroomIds.length > 0) {
      // Lấy tất cả assignments từ các lớp
      const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
        where: { classroomId: { in: classroomIds } },
        select: { assignmentId: true },
      });

      const assignmentIds = assignmentClassrooms.map((ac) => ac.assignmentId);

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
        const upcomingIds = upcomingAssignmentsData.map((a) => a.id);
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

    // 4. Tính điểm trung bình từ các submissions đã được chấm
    const gradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        grade: { not: null },
      },
      select: { grade: true },
    });

    const averageGrade =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) /
          gradedSubmissions.length
        : 0;

    // 5. Tính điểm trung bình tháng trước để so sánh
    const lastMonthGradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        grade: { not: null },
        submittedAt: {
          gte: oneMonthAgo,
          lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { grade: true },
    });

    const lastMonthAverage =
      lastMonthGradedSubmissions.length > 0
        ? lastMonthGradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) /
          lastMonthGradedSubmissions.length
        : 0;

    const gradeChange = averageGrade - lastMonthAverage;

    // 6. Đếm số bài học (lessons) từ các khóa học trong các lớp
    const coursesInClassrooms = await prisma.classroomCourse.findMany({
      where: { classroomId: { in: classroomIds } },
      select: { courseId: true },
    });

    const courseIds = coursesInClassrooms.map((cc) => cc.courseId);
    const totalLessons =
      courseIds.length > 0
        ? await prisma.lesson.count({
            where: { courseId: { in: courseIds } },
          })
        : 0;

    // 7. Đếm số bài học mới trong tuần này
    const newLessonsThisWeek =
      courseIds.length > 0
        ? await prisma.lesson.count({
            where: {
              courseId: { in: courseIds },
              createdAt: { gte: oneWeekAgo },
            },
          })
        : 0;

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

