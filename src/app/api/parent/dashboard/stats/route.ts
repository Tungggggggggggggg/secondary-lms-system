import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/parent/dashboard/stats
 * Lấy thống kê tổng quan cho parent dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, UserRole.PARENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Lấy danh sách tất cả con của phụ huynh
    const relationships = await prisma.parentStudent.findMany({
      where: {
        parentId: user.id,
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
    });

    const studentIds = relationships.map((rel) => rel.studentId);
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

    // Lấy tất cả submissions của tất cả con
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: { in: studentIds },
      },
      select: {
        id: true,
        grade: true,
        submittedAt: true,
      },
    });

    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter((sub) => sub.grade !== null);
    const totalGraded = gradedSubmissions.length;
    const totalPending = totalSubmissions - totalGraded;

    // Tính điểm trung bình tổng
    const overallAverage =
      totalGraded > 0
        ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) / totalGraded
        : 0;

    // Tính điểm trung bình tháng trước để so sánh
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const lastMonthSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        grade: { not: null },
        submittedAt: {
          gte: twoMonthsAgo,
          lt: oneMonthAgo,
        },
      },
      select: { grade: true },
    });

    const lastMonthAverage =
      lastMonthSubmissions.length > 0
        ? lastMonthSubmissions.reduce((sum, sub) => sum + (sub.grade || 0), 0) /
          lastMonthSubmissions.length
        : 0;

    const averageChange = overallAverage - lastMonthAverage;

    // Tính số assignments sắp đến hạn của tất cả con
    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: { studentId: { in: studentIds } },
      select: { classroomId: true },
    });

    const classroomIds = studentClassrooms.map((sc) => sc.classroomId);
    let upcomingAssignments = 0;

    if (classroomIds.length > 0) {
      const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
        where: { classroomId: { in: classroomIds } },
        select: { assignmentId: true },
      });

      const assignmentIds = assignmentClassrooms.map((ac) => ac.assignmentId);

      if (assignmentIds.length > 0) {
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

        const upcomingIds = upcomingAssignmentsData.map((a) => a.id);
        if (upcomingIds.length > 0) {
          const submittedUpcoming = await prisma.assignmentSubmission.count({
            where: {
              assignmentId: { in: upcomingIds },
              studentId: { in: studentIds },
            },
          });
          upcomingAssignments = upcomingIds.length - submittedUpcoming;
        }
      }
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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

