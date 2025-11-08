import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/system/stats
 * Lấy system-wide statistics cho SUPER_ADMIN
 */
export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Forbidden: SUPER_ADMIN only");
    }

    // Lấy các thống kê tổng quan
    const [
      totalUsers,
      totalClassrooms,
      totalCourses,
      totalAssignments,
      totalSubmissions,
      totalOrganizations,
      totalAnnouncements,
      totalComments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.classroom.count(),
      prisma.course.count(),
      prisma.assignment.count(),
      prisma.assignmentSubmission.count(),
      prisma.organization.count(),
      prisma.announcement.count(),
      prisma.announcementComment.count(),
    ]);

    // Lấy số lượng users theo role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        role: true,
      },
    });

    // Lấy số lượng users mới trong 30 ngày qua
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersLast30Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalClassrooms,
        totalCourses,
        totalAssignments,
        totalSubmissions,
        totalOrganizations,
        totalAnnouncements,
        totalComments,
        usersByRole: usersByRole.reduce(
          (acc, item) => {
            acc[item.role] = item._count.role;
            return acc;
          },
          {} as Record<string, number>
        ),
        newUsersLast30Days,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/admin/system/stats] Error:", error);
    return errorResponse(500, error?.message || "Internal server error");
  }
}, "ADMIN_SYSTEM_STATS");

