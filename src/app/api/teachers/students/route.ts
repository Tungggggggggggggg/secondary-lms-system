import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

type TeacherStudentRow = {
  studentId: string;
  fullname: string | null;
  email: string;
  classroomId: string;
  classroomName: string;
  classroomCode: string;
  totalAssignments: bigint;
  submittedCount: bigint;
  averageGrade: number | null;
};

type TeacherStudentListItem = {
  id: string;
  fullname: string;
  avatarInitial: string;
  classroomId: string;
  classroomName: string;
  classroomCode: string;
  averageGrade: number | null;
  submissionRate: number;
  submittedCount: number;
  totalAssignments: number;
  status: "active" | "warning" | "inactive";
};

/**
 * GET /api/teachers/students
 * Gộp danh sách học sinh của tất cả lớp thuộc teacher.
 * Tối ưu: 1 query aggregate thay vì N request /api/classrooms/[id]/students.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "TEACHER") {
      return errorResponse(403, "Forbidden - TEACHER role required");
    }

    const teacherId = authUser.id;

    const rows = await prisma.$queryRaw<TeacherStudentRow[]>`
      WITH class_students AS (
        SELECT cs."studentId", cs."classroomId"
        FROM "classroom_students" cs
        JOIN "classrooms" c ON c."id" = cs."classroomId"
        WHERE c."teacherId" = ${teacherId} AND c."isActive" = true
      ),
      class_assignments AS (
        SELECT ac."assignmentId", ac."classroomId"
        FROM "assignment_classrooms" ac
        JOIN "classrooms" c ON c."id" = ac."classroomId"
        WHERE c."teacherId" = ${teacherId} AND c."isActive" = true
      ),
      pairs AS (
        SELECT cs."studentId", cs."classroomId", ca."assignmentId"
        FROM class_students cs
        LEFT JOIN class_assignments ca ON ca."classroomId" = cs."classroomId"
      ),
      latest_submissions AS (
        SELECT DISTINCT ON (s."assignmentId", s."studentId")
          s."assignmentId", s."studentId", s."grade"
        FROM "assignment_submissions" s
        JOIN pairs p
          ON p."assignmentId" = s."assignmentId" AND p."studentId" = s."studentId"
        ORDER BY s."assignmentId", s."studentId", s."attempt" DESC, s."submittedAt" DESC
      )
      SELECT
        cs."studentId" as "studentId",
        u."fullname" as "fullname",
        u."email" as "email",
        c."id" as "classroomId",
        c."name" as "classroomName",
        c."code" as "classroomCode",
        COUNT(DISTINCT p."assignmentId")::bigint as "totalAssignments",
        COUNT(DISTINCT ls."assignmentId")::bigint as "submittedCount",
        AVG(ls."grade") FILTER (WHERE ls."grade" IS NOT NULL) as "averageGrade"
      FROM class_students cs
      JOIN "classrooms" c ON c."id" = cs."classroomId"
      JOIN "users" u ON u."id" = cs."studentId"
      LEFT JOIN pairs p
        ON p."studentId" = cs."studentId" AND p."classroomId" = cs."classroomId"
      LEFT JOIN latest_submissions ls
        ON ls."assignmentId" = p."assignmentId" AND ls."studentId" = cs."studentId"
      GROUP BY cs."studentId", u."fullname", u."email", c."id", c."name", c."code"
      ORDER BY c."createdAt" DESC, u."fullname" ASC;
    `;

    const items: TeacherStudentListItem[] = rows.map((r) => {
      const totalAssignments = Number(r.totalAssignments ?? BigInt(0));
      const submittedCount = Number(r.submittedCount ?? BigInt(0));

      const submissionRate = totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0;

      let status: "active" | "warning" | "inactive" = "active";
      if (submissionRate < 50) status = "inactive";
      else if (submissionRate < 80) status = "warning";

      const displayName =
        (r.fullname && r.fullname.trim().length > 0 && r.fullname) || r.email.split("@")[0];
      const avatarInitial = displayName.charAt(0).toUpperCase();

      return {
        id: r.studentId,
        fullname: displayName,
        avatarInitial,
        classroomId: r.classroomId,
        classroomName: r.classroomName,
        classroomCode: r.classroomCode,
        averageGrade: r.averageGrade !== null ? Math.round(r.averageGrade * 10) / 10 : null,
        submissionRate,
        submittedCount,
        totalAssignments,
        status,
      };
    });

    return NextResponse.json({ success: true, data: items }, { status: 200 });
  } catch (error) {
    console.error("[ERROR] [GET] /api/teachers/students", error);
    return errorResponse(500, "Internal server error");
  }
}
