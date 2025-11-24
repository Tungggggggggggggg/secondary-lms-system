import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { requireReportsRead } from "@/lib/rbac/guards";

// GET /api/admin/org/reports/timeseries?orgId=...&days=14
// Trả về thống kê theo ngày: users, classrooms, courses, assignments, announcements
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  try { await requireReportsRead({ id: authUser.id, role: authUser.role }, orgId || undefined as any); } catch { return errorResponse(403, "Forbidden: insufficient permissions"); }
  if (!orgId) return errorResponse(400, "Missing or invalid orgId");
  const days = Math.min(parseInt(searchParams.get("days") || "14", 10), 90);

  const from = new Date();
  from.setDate(from.getDate() - days + 1);

  // Sử dụng truy vấn SQL thô để date_trunc theo ngày
  // Lưu ý: users không có organizationId -> báo cáo toàn cục cho users
  const [classrooms, courses, assignments, announcements, users] = await Promise.all([
    prisma.$queryRawUnsafe<any[]>(
      `select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') d, count(*) c
       from "classrooms"
       where "createdAt" >= $1 and "organizationId" = $2
       group by 1 order by 1`, [from, orgId]
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') d, count(*) c
       from "courses"
       where "createdAt" >= $1 and "organizationId" = $2
       group by 1 order by 1`, [from, orgId]
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') d, count(*) c
       from "assignments"
       where "createdAt" >= $1 and "organizationId" = $2
       group by 1 order by 1`, [from, orgId]
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') d, count(*) c
       from "announcements"
       where "createdAt" >= $1 and "organizationId" = $2
       group by 1 order by 1`, [from, orgId]
    ),
    prisma.$queryRawUnsafe<any[]>(
      `select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') d, count(*) c
       from "users"
       where "createdAt" >= $1
       group by 1 order by 1`, [from]
    ),
  ]);

  return NextResponse.json({ success: true, series: { classrooms, courses, assignments, announcements, users } });
}, "ADMIN_ORG_REPORTS_TIMESERIES");


