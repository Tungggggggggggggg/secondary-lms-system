import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface ParentChildSubmissionRow {
  id: string;
  studentId: string;
  assignmentId: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}

interface ParentChildAssignmentRow {
  id: string;
  title: string;
  type: string;
  dueDate: Date | null;
}

interface ParentChildAssignmentClassroomRow {
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
 * GET /api/parent/children/grades
 * Lấy danh sách điểm số của tất cả học sinh (con) từ tất cả classrooms
 * Chỉ phụ huynh đã liên kết với học sinh mới có thể xem
 */
export const GET = withApiLogging(async (req: NextRequest) => {
  try {
    // Xác thực user và kiểm tra role
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden - PARENT role required");
    }

    // Lấy danh sách tất cả con của phụ huynh
    const relationships = await prisma.parentStudent.findMany({
      where: {
        parentId: authUser.id,
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

    if (relationships.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {},
        },
        { status: 200 }
      );
    }

    const studentIds = relationships.map(
      (rel: { studentId: string }) => rel.studentId,
    );

    // Lấy tất cả submissions của tất cả con
    const submissions = (await prisma.assignmentSubmission.findMany({
      where: {
        studentId: { in: studentIds },
      },
      select: {
        id: true,
        studentId: true,
        assignmentId: true,
        grade: true,
        feedback: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    })) as ParentChildSubmissionRow[];

    const assignmentIds: string[] = Array.from(
      new Set(submissions.map((s: ParentChildSubmissionRow) => s.assignmentId))
    );

    const [assignments, assignmentClassrooms] = await Promise.all([
      prisma.assignment.findMany({
        where: { id: { in: assignmentIds } },
        select: { id: true, title: true, type: true, dueDate: true },
      }) as unknown as ParentChildAssignmentRow[],

      prisma.assignmentClassroom.findMany({
        where: { assignmentId: { in: assignmentIds } },
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
      }) as unknown as ParentChildAssignmentClassroomRow[],
    ]);

    const assignmentById = new Map<string, ParentChildAssignmentRow>(
      assignments.map((a: ParentChildAssignmentRow) => [a.id, a])
    );

    const classroomByAssignmentId = new Map<string, ParentChildAssignmentClassroomRow["classroom"]>();
    for (const row of assignmentClassrooms) {
      if (!classroomByAssignmentId.has(row.assignmentId)) {
        classroomByAssignmentId.set(row.assignmentId, row.classroom);
      }
    }

    // Transform data và nhóm theo student
    const gradesByStudent: Record<
      string,
      {
        student: {
          id: string;
          email: string;
          fullname: string | null;
          role: string;
        };
        grades: Array<{
          id: string;
          assignmentId: string;
          assignmentTitle: string;
          assignmentType: string;
          dueDate: string | null;
          grade: number | null;
          feedback: string | null;
          submittedAt: string;
          status: "pending" | "submitted" | "graded";
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
          } | null;
        }>;
        statistics: {
          totalSubmissions: number;
          totalGraded: number;
          totalPending: number;
          averageGrade: number;
        };
      }
    > = {};

    // Khởi tạo cho mỗi student
    relationships.forEach(
      (rel: {
        studentId: string;
        student: {
          id: string;
          email: string;
          fullname: string | null;
          role: string;
        };
      }) => {
        gradesByStudent[rel.studentId] = {
          student: rel.student,
          grades: [],
          statistics: {
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            averageGrade: 0,
          },
        };
      },
    );

    // Phân loại submissions theo student
    submissions.forEach((sub: ParentChildSubmissionRow) => {
      const assignment = assignmentById.get(sub.assignmentId);
      if (!assignment) return;
      const classroom = classroomByAssignmentId.get(sub.assignmentId) ?? null;

      const gradeEntry = {
        id: sub.id,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        assignmentType: assignment.type,
        dueDate: assignment.dueDate?.toISOString() || null,
        grade: sub.grade,
        feedback: sub.feedback,
        submittedAt: sub.submittedAt.toISOString(),
        status: (sub.grade !== null ? "graded" : "submitted") as "pending" | "submitted" | "graded",
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

      if (gradesByStudent[sub.studentId]) {
        gradesByStudent[sub.studentId].grades.push(gradeEntry);
      }
    });

    // Tính thống kê cho mỗi student
    const result = Object.values(gradesByStudent).map((studentData) => {
      const { grades } = studentData;
      const totalSubmissions = grades.length;
      const gradedSubmissions = grades.filter((g) => g.grade !== null);
      const totalGraded = gradedSubmissions.length;
      const totalPending = totalSubmissions - totalGraded;

      const averageGrade =
        totalGraded > 0
          ? gradedSubmissions.reduce((sum, g) => sum + (g.grade || 0), 0) / totalGraded
          : 0;

      return {
        student: studentData.student,
        grades,
        statistics: {
          totalSubmissions,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10,
        },
      };
    });

    // Tính thống kê tổng hợp
    const allGradedSubmissions = result.flatMap((r) =>
      r.grades.filter((g) => g.grade !== null)
    );
    const overallAverage =
      allGradedSubmissions.length > 0
        ? allGradedSubmissions.reduce((sum, g) => sum + (g.grade || 0), 0) /
          allGradedSubmissions.length
        : 0;

    const overallStatistics = {
      totalChildren: result.length,
      totalSubmissions: result.reduce((sum, r) => sum + r.statistics.totalSubmissions, 0),
      totalGraded: result.reduce((sum, r) => sum + r.statistics.totalGraded, 0),
      totalPending: result.reduce((sum, r) => sum + r.statistics.totalPending, 0),
      overallAverage: Math.round(overallAverage * 10) / 10,
    };

    console.log(
      `[INFO] [GET] /api/parent/children/grades - Found ${submissions.length} submissions for ${result.length} children`
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        statistics: overallStatistics,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/parent/children/grades - Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(500, errorMessage);
  }
}, "PARENT_ALL_CHILDREN_GRADES");

