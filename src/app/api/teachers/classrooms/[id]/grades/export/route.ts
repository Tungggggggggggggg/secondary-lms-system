import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getRequestId, isTeacherOfClassroom } from "@/lib/api-utils";
import { getEffectiveDeadline } from "@/lib/grades/assignmentDeadline";
import { withPerformanceTracking } from "@/lib/performance-monitor";
import { sqltag as sql } from "@prisma/client/runtime/library";

const querySchema = z.object({
  status: z.enum(["all", "graded", "ungraded"]).default("all"),
  search: z.string().max(200).default(""),
  assignmentId: z.string().max(64).optional(),
  sort: z.enum(["recent", "due", "grade"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(10000).default(5000),
});

function formatDateTimeVN(value: Date | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (s || "classroom").slice(0, 60);
}

function formatTimestampForFilename(date: Date): string {
  const raw = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  return raw.replace(" ", "_").replace(/:/g, "-");
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requestId = getRequestId(req);

  return withPerformanceTracking("/api/teachers/classrooms/[id]/grades/export", "GET", async () => {
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
      const parsed = querySchema.safeParse({
        status: searchParams.get("status") || undefined,
        search: searchParams.get("search") || undefined,
        assignmentId: searchParams.get("assignmentId") || undefined,
        sort: searchParams.get("sort") || undefined,
        limit: searchParams.get("limit") || undefined,
      });

      if (!parsed.success) {
        return errorResponse(400, "Dữ liệu không hợp lệ", {
          requestId,
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        });
      }

      const status = parsed.data.status;
      const search = parsed.data.search.trim();
      const assignmentId = parsed.data.assignmentId;
      const sort = parsed.data.sort;
      const limit = parsed.data.limit;

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

      const orderBySql =
        sort === "grade"
          ? sql` ORDER BY f.grade DESC NULLS LAST, f."submittedAt" DESC`
          : sort === "due"
          ? sql` ORDER BY COALESCE(f."lockAt", f."dueDate") ASC NULLS LAST, f."submittedAt" DESC`
          : sql` ORDER BY f."submittedAt" DESC`;

      const [classroom, pageRows] = await Promise.all([
        prisma.classroom.findUnique({
          where: { id: classroomId },
          select: { name: true },
        }),
        prisma.$queryRaw(
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
            LIMIT ${limit}
          `
        ),
      ]);

      const classroomName = classroom?.name || "Lớp học";

      const headers = [
        "Học sinh",
        "Email",
        "Bài tập",
        "Loại",
        "Hạn nộp",
        "Nộp lúc",
        "Điểm",
        "Trạng thái",
        "Nhận xét",
      ];

      const rows = (pageRows as Array<{
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
      }>).map((r) => {
        const effectiveDeadline = getEffectiveDeadline({ dueDate: r.dueDate, lockAt: r.lockAt });
        const due = formatDateTimeVN(effectiveDeadline ?? undefined);
        const submitted = formatDateTimeVN(r.submittedAt ?? undefined);
        const grade = r.grade !== null && typeof r.grade === "number" ? Math.round(r.grade * 10) / 10 : null;
        const statusLabel = grade !== null ? "Đã chấm" : "Chờ chấm";

        return [
          r.fullname?.trim() || "Không tên",
          r.email,
          r.title ?? "",
          r.type,
          due,
          submitted,
          grade,
          statusLabel,
          r.feedback ?? "",
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = [
        { wch: 22 },
        { wch: 28 },
        { wch: 40 },
        { wch: 10 },
        { wch: 20 },
        { wch: 20 },
        { wch: 8 },
        { wch: 12 },
        { wch: 60 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bang diem");

      const arrayBuffer = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array",
      }) as unknown as ArrayBuffer;

      const ts = formatTimestampForFilename(new Date());
      const filename = `bang-diem-${slugify(classroomName)}-${ts}.xlsx`;

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
          "X-Request-Id": requestId,
        },
      });
    } catch (error: unknown) {
      console.error(
        `[ERROR] [GET] /api/teachers/classrooms/${params.id}/grades/export {requestId:${requestId}}`,
        error
      );
      return errorResponse(500, "Internal server error", { requestId });
    }
  })();
}
