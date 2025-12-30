import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { getEffectiveDeadline } from "@/lib/grades/assignmentDeadline";
import { sqltag as sql } from "@prisma/client/runtime/library";

const querySchema = z.object({
  status: z.enum(["all", "graded", "ungraded"]).default("all"),
  search: z.string().max(200).default(""),
  assignmentId: z.string().max(64).optional(),
  sort: z.enum(["recent", "due", "grade"]).default("recent"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

// GET: Danh sách submissions/grades của lớp cho giáo viên (newest-first, filter, search)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const classroomId = params.id;
    if (!classroomId) {
      return errorResponse(400, "classroomId is required", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const owns = await isTeacherOfClassroom(user.id, classroomId);
    if (!owns) {
      return errorResponse(403, "Forbidden - Not your classroom", { requestId });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = querySchema.safeParse({
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      assignmentId: searchParams.get("assignmentId") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        requestId,
        details: parsedQuery.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const status = parsedQuery.data.status;
    const search = parsedQuery.data.search.trim();
    const assignmentId = parsedQuery.data.assignmentId;
    const sort = parsedQuery.data.sort;
    const page = parsedQuery.data.page;
    const pageSize = parsedQuery.data.pageSize;
    const offset = (page - 1) * pageSize;

    const like = search ? `%${search.toLowerCase()}%` : null;

    const statusSql =
      status === "graded"
        ? sql` AND f.grade IS NOT NULL`
        : status === "ungraded"
        ? sql` AND f.grade IS NULL`
        : sql``;

    const assignmentSql = assignmentId ? sql` AND f."assignmentId" = ${assignmentId}` : sql``;

    const searchSql = like
      ? sql` AND (
          LOWER(f.fullname) LIKE ${like}
          OR LOWER(f.email) LIKE ${like}
          OR LOWER(f.title) LIKE ${like}
        )`
      : sql``;

    const base = sql`
      WITH latest AS (
        SELECT DISTINCT ON (s."studentId", s."assignmentId")
          s.id,
          s."studentId",
          s."assignmentId",
          s.grade,
          s.feedback,
          s."submittedAt"
        FROM "assignment_submissions" s
        JOIN "classroom_students" cs
          ON cs."studentId" = s."studentId" AND cs."classroomId" = ${classroomId}
        JOIN "assignment_classrooms" ac
          ON ac."assignmentId" = s."assignmentId" AND ac."classroomId" = ${classroomId}
        ORDER BY s."studentId", s."assignmentId", s.attempt DESC
      ),
      filtered AS (
        SELECT
          l.id,
          l."studentId",
          l."assignmentId",
          l.grade,
          l.feedback,
          l."submittedAt",
          u.fullname,
          u.email,
          a.title,
          a.type,
          a."dueDate",
          a."lockAt"
        FROM latest l
        JOIN "users" u ON u.id = l."studentId"
        JOIN "assignments" a ON a.id = l."assignmentId"
        WHERE 1=1
      )
    `;

    const statsRows = (await prisma.$queryRaw(
      sql`${base}
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE grade IS NOT NULL)::int as graded,
          COUNT(*) FILTER (WHERE grade IS NULL)::int as pending,
          AVG(grade) FILTER (WHERE grade IS NOT NULL) as average,
          MAX(grade) FILTER (WHERE grade IS NOT NULL) as highest,
          MIN(grade) FILTER (WHERE grade IS NOT NULL) as lowest
        FROM filtered f
        WHERE 1=1
        ${statusSql}
        ${assignmentSql}
        ${searchSql}
      `
    )) as Array<{
      total: number;
      graded: number;
      pending: number;
      average: number | null;
      highest: number | null;
      lowest: number | null;
    }>;

    const stats = statsRows[0] ?? {
      total: 0,
      graded: 0,
      pending: 0,
      average: null,
      highest: null,
      lowest: null,
    };

    const orderBySql =
      sort === "grade"
        ? sql` ORDER BY f.grade DESC NULLS LAST, f."submittedAt" DESC`
        : sort === "due"
        ? sql` ORDER BY COALESCE(f."lockAt", f."dueDate") ASC NULLS LAST, f."submittedAt" DESC`
        : sql` ORDER BY f."submittedAt" DESC`;

    const pageRows = (await prisma.$queryRaw(
      sql`${base}
        SELECT
          f.id,
          f."studentId",
          f."assignmentId",
          f.grade,
          f.feedback,
          f."submittedAt",
          f.fullname,
          f.email,
          f.title,
          f.type,
          f."dueDate",
          f."lockAt"
        FROM filtered f
        WHERE 1=1
        ${statusSql}
        ${assignmentSql}
        ${searchSql}
        ${orderBySql}
        LIMIT ${pageSize} OFFSET ${offset}
      `
    )) as Array<{
      id: string;
      studentId: string;
      assignmentId: string;
      grade: number | null;
      feedback: string | null;
      submittedAt: Date;
      fullname: string | null;
      email: string;
      title: string | null;
      type: string;
      dueDate: Date | null;
      lockAt: Date | null;
    }>;

    const data = pageRows.map((r) => {
      const effectiveDeadline = getEffectiveDeadline({ dueDate: r.dueDate, lockAt: r.lockAt });
      return {
        id: r.id,
        student: {
          id: r.studentId,
          fullname: r.fullname,
          email: r.email,
        },
        assignment: {
          id: r.assignmentId,
          title: r.title ?? "",
          type: r.type,
          dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
        },
        grade: r.grade,
        feedback: r.feedback,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
        status: r.grade !== null ? "graded" : "ungraded",
      };
    });

    const res = NextResponse.json(
      {
        success: true,
        data,
        statistics: {
          total: stats.total,
          graded: stats.graded,
          pending: stats.pending,
          average: stats.average !== null ? Math.round(stats.average * 10) / 10 : null,
          highest: stats.highest !== null ? Math.round(stats.highest * 10) / 10 : null,
          lowest: stats.lowest !== null ? Math.round(stats.lowest * 10) / 10 : null,
        },
        pagination: {
          page,
          pageSize,
          total: stats.total,
          totalPages: Math.ceil(stats.total / pageSize),
          hasMore: offset + data.length < stats.total,
        },
        requestId,
      },
      { status: 200 }
    );
    res.headers.set("Cache-Control", "public, max-age=10, s-maxage=30, stale-while-revalidate=60");
    return res;
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/teachers/classrooms/${params.id}/grades {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


