import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface StudentGradesSubmissionRow {
  id: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}

interface StudentGradesAssignmentRow {
  id: string;
  title: string;
  type: string;
  dueDate: Date | null;
}

interface StudentGradesAssignmentClassroomRow {
  assignmentId: string;
  classroom: {
    id: string;
    name: string;
    code: string;
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
        },
        orderBy: { submittedAt: "desc" },
      }) as unknown as StudentGradesSubmissionRow[],

      prisma.assignment.findMany({
        where: { id: { in: assignmentIdList } },
        select: { id: true, title: true, type: true, dueDate: true },
      }) as unknown as StudentGradesAssignmentRow[],

      prisma.assignmentClassroom.findMany({
        where: { assignmentId: { in: assignmentIdList } },
        select: {
          assignmentId: true,
          classroom: {
            select: {
              id: true,
              name: true,
              code: true,
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

    // Transform data cho các bài đã nộp
    const submissionGrades = submissions
      .map((sub: StudentGradesSubmissionRow) => {
        const assignment = assignmentById.get(sub.assignmentId);
        if (!assignment) return null;
        const classroom = classroomByAssignmentId.get(sub.assignmentId) ?? null;

        return {
          id: sub.id,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentType: assignment.type,
          dueDate: assignment.dueDate?.toISOString() || null,
          grade: sub.grade,
          feedback: sub.feedback,
          submittedAt: sub.submittedAt.toISOString(),
          status: sub.grade !== null ? "graded" : "submitted",
          classroom: classroom
            ? {
                id: classroom.id,
                name: classroom.name,
                code: classroom.code,
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // Tìm các assignments chưa có submission nào từ student
    const submittedAssignmentIds = new Set<string>(submissions.map((sub) => sub.assignmentId));
    const missingAssignmentIds = assignmentIdList.filter((id) => !submittedAssignmentIds.has(id));

    const now = new Date();

    // Tạo các grade entry ảo với điểm 0 cho bài chưa nộp
    const missingGrades = missingAssignmentIds
      .map((assignmentId: string) => {
        const assignment = assignmentById.get(assignmentId);
        if (!assignment) return null;
        const classroom = classroomByAssignmentId.get(assignmentId) ?? null;

        const isPastDue = assignment.dueDate !== null && assignment.dueDate < now;

        return {
          id: `virtual-${assignment.id}`,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentType: assignment.type,
          dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
          grade: 0,
          feedback: null,
          submittedAt: null as string | null,
          status: isPastDue ? "graded" : "pending",
          classroom: classroom
            ? {
                id: classroom.id,
                name: classroom.name,
                code: classroom.code,
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const grades = [...submissionGrades, ...missingGrades];

    // Tính điểm trung bình chỉ dựa trên các bài đã được chấm thực tế
    const gradedSubmissions = submissions.filter((sub: StudentGradesSubmissionRow) => sub.grade !== null);
    const averageGrade =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce(
            (sum: number, sub: StudentGradesSubmissionRow) =>
              sum + (sub.grade || 0),
            0,
          ) / gradedSubmissions.length
        : 0;

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalGraded: gradedSubmissions.length,
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
