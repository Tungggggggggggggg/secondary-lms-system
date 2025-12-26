import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

interface StudentClassroomGradeSubmissionRow {
  id: string;
  assignmentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
  attempt: number;
  assignment: {
    id: string;
    title: string;
    type: string;
    dueDate: Date | null;
    lockAt: Date | null;
  };
}

/**
 * GET /api/students/classrooms/[id]/grades
 * Lấy danh sách điểm số của student trong một classroom cụ thể
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const classroomId = parsedParams.data.id;

    // Kiểm tra student có tham gia classroom không
    const isMember = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: user.id,
      },
    });

    if (!isMember) {
      return errorResponse(403, "Forbidden - Not a member of this classroom");
    }

    // Lấy tất cả assignments của classroom
    const assignmentIds = await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    });

    const assignmentIdList: string[] = Array.from(
      new Set(
        assignmentIds.map(
          (ac: { assignmentId: string }) => ac.assignmentId,
        ),
      ),
    );

    if (assignmentIdList.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {
            totalGraded: 0,
            averageGrade: 0,
          },
        },
        { status: 200 }
      );
    }

    // Lấy submissions của student cho các assignments này
    const submissionsRaw = await prisma.assignmentSubmission.findMany({
      where: {
        studentId: user.id,
        assignmentId: { in: assignmentIdList },
      },
      select: {
        id: true,
        assignmentId: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        attempt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            lockAt: true,
          },
        },
      },
      orderBy: [{ attempt: "desc" }, { submittedAt: "desc" }],
    });

    const submissions =
      submissionsRaw as StudentClassroomGradeSubmissionRow[];

    // Giữ lại submission mới nhất cho mỗi assignment (tránh đếm sai theo attempt)
    const latestByAssignmentId = new Map<string, StudentClassroomGradeSubmissionRow>();
    for (const s of submissions) {
      if (!latestByAssignmentId.has(s.assignmentId)) {
        latestByAssignmentId.set(s.assignmentId, s);
      }
    }
    const latestSubmissions = Array.from(latestByAssignmentId.values());

    // Transform data cho các bài đã nộp (bao gồm cả chưa chấm)
    const submissionGrades = latestSubmissions.map(
      (sub: StudentClassroomGradeSubmissionRow) => ({
        id: sub.id,
        assignmentId: sub.assignment.id,
        assignmentTitle: sub.assignment.title,
        assignmentType: sub.assignment.type,
        dueDate: getEffectiveDeadline(sub.assignment)?.toISOString() || null,
        grade: sub.grade,
        feedback: sub.feedback,
        submittedAt: sub.submittedAt.toISOString(),
        status:
          sub.grade !== null
            ? "graded"
            : sub.submittedAt
            ? "submitted"
            : "pending",
      }),
    );

    // Tìm các assignments chưa có submission nào từ student
    const submittedAssignmentIds = new Set(
      latestSubmissions.map(
        (sub: StudentClassroomGradeSubmissionRow) => sub.assignmentId,
      ),
    );

    const missingAssignments = (await prisma.assignment.findMany({
      where: {
        id: {
          in: assignmentIdList.filter(
            (id) => !submittedAssignmentIds.has(id),
          ),
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        lockAt: true,
      },
    })) as Array<{ id: string; title: string; type: string; dueDate: Date | null; lockAt: Date | null }>;

    const now = new Date();

    // Tạo các grade entry ảo với điểm 0 cho bài chưa nộp
    const missingGrades = missingAssignments.map((assignment) => {
      const isPastDue = isAssignmentOverdue(assignment, now);
      const effectiveDeadline = getEffectiveDeadline(assignment);

      return {
        id: `virtual-${assignment.id}`,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        assignmentType: assignment.type,
        dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
        grade: isPastDue ? 0 : null,
        feedback: null,
        submittedAt: null as string | null,
        status: isPastDue ? "graded" : "pending",
      };
    }) as Array<{ grade: number | null }>;

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình: chỉ tính bài đã chấm + bài quá hạn chưa nộp (0). Không tính bài chưa đến hạn hoặc dueDate=null.
    const gradedLatestSubmissions = latestSubmissions.filter(
      (sub: StudentClassroomGradeSubmissionRow) => sub.grade !== null,
    );
    const overdueMissingCount = missingGrades.filter((g) => g.grade === 0).length;
    const denom = gradedLatestSubmissions.length + overdueMissingCount;
    const sumGrades = gradedLatestSubmissions.reduce(
      (sum: number, sub: StudentClassroomGradeSubmissionRow) => sum + (sub.grade || 0),
      0
    );
    const averageGrade = denom > 0 ? sumGrades / denom : 0;

    const totalAssignments = assignmentIdList.length;
    const totalGraded = denom;
    const totalPending = Math.max(0, totalAssignments - totalGraded);

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalSubmissions: totalAssignments,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/classrooms/[id]/grades - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
