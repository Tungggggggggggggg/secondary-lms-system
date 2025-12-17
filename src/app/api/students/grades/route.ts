import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";

interface StudentGradesSubmissionRow {
  id: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
  attempt: number;
}

interface StudentGradesAssignmentRow {
  id: string;
  title: string;
  type: string;
  dueDate: Date | null;
  lockAt: Date | null;
}

interface StudentGradesAssignmentClassroomRow {
  assignmentId: string;
  classroom: {
    id: string;
    name: string;
    icon: string | null;
    teacher: {
      id: string;
      fullname: string | null;
      email: string;
    } | null;
  };
}

/**
 * GET /api/students/grades
 * Lấy danh sách điểm số của student từ tất cả classrooms
 */
export async function GET(_req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(_req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "STUDENT") {
      return errorResponse(403, "Forbidden - Student role required");
    }

    // Lấy danh sách classroom mà student đang tham gia
    const classroomLinks = await prisma.classroomStudent.findMany({
      where: { studentId: authUser.id },
      select: { classroomId: true },
    });

    const classroomIds = classroomLinks.map(
      (cs: { classroomId: string }) => cs.classroomId,
    );

    if (classroomIds.length === 0) {
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

    // Lấy tất cả assignments của các classroom này
    const assignmentLinks = await prisma.assignmentClassroom.findMany({
      where: {
        classroomId: { in: classroomIds },
      },
      select: { assignmentId: true },
    });

    const assignmentIdList: string[] = Array.from(
      new Set(
        assignmentLinks.map(
          (al: { assignmentId: string }) => al.assignmentId,
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

    const [submissions, assignments, assignmentClassrooms] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: {
          studentId: authUser.id,
          assignmentId: { in: assignmentIdList },
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          feedback: true,
          submittedAt: true,
          attempt: true,
        },
        orderBy: [{ attempt: "desc" }, { submittedAt: "desc" }],
      }) as unknown as StudentGradesSubmissionRow[],

      prisma.assignment.findMany({
        where: { id: { in: assignmentIdList } },
        select: { id: true, title: true, type: true, dueDate: true, lockAt: true },
      }) as unknown as StudentGradesAssignmentRow[],

      prisma.assignmentClassroom.findMany({
        where: { assignmentId: { in: assignmentIdList } },
        select: {
          assignmentId: true,
          classroom: {
            select: {
              id: true,
              name: true,
              icon: true,
              teacher: { select: { id: true, fullname: true, email: true } },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      }) as unknown as StudentGradesAssignmentClassroomRow[],
    ]);

    const assignmentById = new Map<string, StudentGradesAssignmentRow>(
      assignments.map((a: StudentGradesAssignmentRow) => [a.id, a])
    );

    const classroomByAssignmentId = new Map<string, StudentGradesAssignmentClassroomRow["classroom"]>();
    for (const row of assignmentClassrooms) {
      if (!classroomByAssignmentId.has(row.assignmentId)) {
        classroomByAssignmentId.set(row.assignmentId, row.classroom);
      }
    }

    // Giữ lại submission mới nhất cho mỗi assignment (tránh đếm sai theo attempt)
    const latestSubmissionByAssignmentId = new Map<string, StudentGradesSubmissionRow>();
    for (const s of submissions) {
      if (!latestSubmissionByAssignmentId.has(s.assignmentId)) {
        latestSubmissionByAssignmentId.set(s.assignmentId, s);
      }
    }
    const latestSubmissions = Array.from(latestSubmissionByAssignmentId.values());

    // Transform data cho các bài đã nộp
    const submissionGrades = latestSubmissions
      .map((sub: StudentGradesSubmissionRow) => {
        const assignment = assignmentById.get(sub.assignmentId);
        if (!assignment) return null;
        const classroom = classroomByAssignmentId.get(sub.assignmentId) ?? null;
        const effectiveDeadline = getEffectiveDeadline(assignment);

        return {
          id: sub.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentType: assignment.type,
          dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
          grade: sub.grade,
          feedback: sub.feedback,
          submittedAt: sub.submittedAt.toISOString(),
          status: sub.grade !== null ? "graded" : "submitted",
          classroom: classroom
            ? {
                id: classroom.id,
                name: classroom.name,
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // Tìm các assignments chưa có submission nào từ student
    const submittedAssignmentIds = new Set<string>(latestSubmissions.map((sub) => sub.assignmentId));
    const missingAssignmentIds = assignmentIdList.filter((id) => !submittedAssignmentIds.has(id));

    const now = new Date();

    // Tạo các grade entry ảo với điểm 0 cho bài chưa nộp
    const missingGrades = missingAssignmentIds
      .map((assignmentId: string) => {
        const assignment = assignmentById.get(assignmentId);
        if (!assignment) return null;
        const classroom = classroomByAssignmentId.get(assignmentId) ?? null;

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
          classroom: classroom
            ? {
                id: classroom.id,
                name: classroom.name,
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình: chỉ tính bài đã chấm + bài quá hạn chưa nộp (0). Không tính bài chưa đến hạn hoặc dueDate=null.
    const gradedSubmissions = latestSubmissions.filter((sub: StudentGradesSubmissionRow) => sub.grade !== null);
    const overdueMissingCount = missingGrades.filter((g) => g.grade === 0).length;
    const denom = gradedSubmissions.length + overdueMissingCount;
    const sumGrades = gradedSubmissions.reduce(
      (sum: number, sub: StudentGradesSubmissionRow) => sum + (sub.grade || 0),
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
          averageGrade: Math.round(averageGrade * 10) / 10, // Làm tròn 1 chữ số thập phân
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/students/grades - Error:", error);
    return errorResponse(500, "Internal server error");
  }
}
