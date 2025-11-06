import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { requireOrgAccess } from "@/lib/org-scope";

// GET /api/admin/org/reports/overview?orgId=...
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const orgId = await (async () => {
    try { return await requireOrgAccess(req, authUser, searchParams.get("orgId")); } catch (e: any) { return null; }
  })();
  if (!orgId) return errorResponse(400, "Missing or invalid orgId");

  const [users, classrooms, courses, assignments, submissions] = await Promise.all([
    prisma.user.count(),
    prisma.classroom.count({ where: { organizationId: orgId } }),
    prisma.course.count({ where: { organizationId: orgId } }),
    prisma.assignment.count({ where: { organizationId: orgId } }),
    prisma.assignmentSubmission.count({
      where: { assignment: { organizationId: orgId } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    stats: { users, classrooms, courses, assignments, submissions },
  });
}, "ADMIN_ORG_REPORTS_OVERVIEW");


