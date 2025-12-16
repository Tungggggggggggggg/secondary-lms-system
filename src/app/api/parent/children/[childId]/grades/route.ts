import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface ParentChildSubmissionRow {
  id: string;
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
  createdAt: Date;
}

interface ParentChildAssignmentClassroomRow {
  assignmentId: string;
  assignment: ParentChildAssignmentRow;
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
 * GET /api/parent/children/[childId]/grades
 * Lấy danh sách điểm số của học sinh (con) từ tất cả classrooms
 * Chỉ phụ huynh đã liên kết với học sinh mới có thể xem
 */
export const GET = withApiLogging(async (
  req: NextRequest,
  { params }: { params: { childId: string } }
) => {
  try {
    const childId = params.childId;
    if (!childId) {
      return errorResponse(400, "childId is required");
    }

    const windowDaysParam = req.nextUrl.searchParams.get("windowDays");
    let windowDays: number | null = null;
    if (windowDaysParam !== null && windowDaysParam !== undefined && windowDaysParam !== "") {
      const parsed = Number(windowDaysParam);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        return errorResponse(400, "windowDays không hợp lệ");
      }
      // clamp để tránh query quá nặng
      windowDays = Math.min(Math.max(parsed, 1), 365);
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    let limit: number | null = null;
    if (limitParam !== null && limitParam !== undefined && limitParam !== "") {
      const parsed = Number(limitParam);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
        return errorResponse(400, "limit không hợp lệ");
      }
      limit = Math.min(Math.max(parsed, 1), 200);
    }

    const cursor = req.nextUrl.searchParams.get("cursor") || null;

    // Xác thực user và kiểm tra role
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden - PARENT role required");
    }

    // Kiểm tra parent-student relationship
    const relationship = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: authUser.id,
          studentId: childId,
        },
      },
    });

    if (!relationship) {
      return errorResponse(403, "Forbidden - No relationship found with this student");
    }

    // Kiểm tra status phải là ACTIVE
    if (relationship.status !== "ACTIVE") {
      return errorResponse(403, "Forbidden - Relationship is not active");
    }

    // Kiểm tra student có tồn tại và có role STUDENT
    const student = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, role: true },
    });

    if (!student || student.role !== "STUDENT") {
      return errorResponse(404, "Student not found");
    }

    // Lấy danh sách classroom mà học sinh (con) đang tham gia
    const classroomLinks = await prisma.classroomStudent.findMany({
      where: { studentId: childId },
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
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            averageGrade: 0,
          },
        },
        { status: 200 }
      );
    }

    const now = new Date();
    const fromDate = windowDays ? new Date(now.getTime() - windowDays * 86400000) : null;

    const assignmentWhere = {
      classrooms: { some: { classroomId: { in: classroomIds } } },
      ...(fromDate
        ? {
            OR: [
              { dueDate: { gte: fromDate } },
              { dueDate: null, createdAt: { gte: fromDate } },
              {
                submissions: {
                  some: {
                    studentId: childId,
                    submittedAt: { gte: fromDate },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const take = limit ? limit + 1 : undefined;

    const assignmentsPage = (await prisma.assignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        createdAt: true,
      },
      orderBy: { id: "desc" },
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })) as unknown as ParentChildAssignmentRow[];

    let nextCursor: string | null = null;
    let hasMore = false;

    let assignments = assignmentsPage;
    if (limit && assignmentsPage.length > limit) {
      assignmentsPage.pop();
      assignments = assignmentsPage;
      if (assignments.length > 0) {
        nextCursor = assignments[assignments.length - 1]!.id;
        hasMore = true;
      }
    }

    if (assignments.length === 0) {
      const [totalSubmissions, totalGraded, avgGrade] = await Promise.all([
        prisma.assignmentSubmission.count({
          where: {
            studentId: childId,
            ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
            assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
          },
        }),
        prisma.assignmentSubmission.count({
          where: {
            studentId: childId,
            grade: { not: null },
            ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
            assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
          },
        }),
        prisma.assignmentSubmission.aggregate({
          where: {
            studentId: childId,
            grade: { not: null },
            ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
            assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
          },
          _avg: { grade: true },
        }),
      ]);

      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {
            totalSubmissions,
            totalGraded,
            totalPending: totalSubmissions - totalGraded,
            averageGrade: Math.round(((avgGrade._avg.grade ?? 0) as number) * 10) / 10,
          },
          pageInfo: {
            nextCursor: null,
            hasMore: false,
            limit: limit ?? null,
          },
        },
        { status: 200 }
      );
    }

    const assignmentIdList = assignments.map((a) => a.id);

    const [assignmentClassrooms, submissions, totalSubmissions, totalGraded, avgGrade] = await Promise.all([
      (await prisma.assignmentClassroom.findMany({
        where: {
          classroomId: { in: classroomIds },
          assignmentId: { in: assignmentIdList },
        },
        select: {
          assignmentId: true,
          assignment: {
            select: {
              id: true,
              title: true,
              type: true,
              dueDate: true,
              createdAt: true,
            },
          },
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
      })) as unknown as ParentChildAssignmentClassroomRow[],

      (await prisma.assignmentSubmission.findMany({
        where: {
          studentId: childId,
          assignmentId: { in: assignmentIdList },
          ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
        },
        select: {
          id: true,
          assignmentId: true,
          grade: true,
          feedback: true,
          submittedAt: true,
        },
        orderBy: { submittedAt: "desc" },
      })) as unknown as ParentChildSubmissionRow[],

      prisma.assignmentSubmission.count({
        where: {
          studentId: childId,
          ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
          assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
        },
      }),
      prisma.assignmentSubmission.count({
        where: {
          studentId: childId,
          grade: { not: null },
          ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
          assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
        },
      }),
      prisma.assignmentSubmission.aggregate({
        where: {
          studentId: childId,
          grade: { not: null },
          ...(fromDate ? { submittedAt: { gte: fromDate } } : {}),
          assignment: { classrooms: { some: { classroomId: { in: classroomIds } } } },
        },
        _avg: { grade: true },
      }),
    ]);

    const assignmentById = new Map<string, ParentChildAssignmentRow>(
      assignments.map((a) => [a.id, a])
    );

    const classroomByAssignmentId = new Map<string, ParentChildAssignmentClassroomRow["classroom"]>();
    for (const row of assignmentClassrooms) {
      if (!classroomByAssignmentId.has(row.assignmentId)) {
        classroomByAssignmentId.set(row.assignmentId, row.classroom);
      }
    }

    // Transform data cho các bài đã nộp
    const submissionGrades = submissions
      .map((sub: ParentChildSubmissionRow) => {
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
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    // Tìm các assignments chưa có submission nào từ student
    const submittedAssignmentIds = new Set<string>(submissions.map((sub) => sub.assignmentId));
    const missingAssignmentIds = assignmentIdList.filter((id: string) => !submittedAssignmentIds.has(id));

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
                icon: classroom.icon,
                teacher: classroom.teacher,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const grades = [...submissionGrades, ...missingGrades];

    const totalPending = totalSubmissions - totalGraded;
    const averageGrade = (avgGrade._avg.grade ?? 0) as number;

    return NextResponse.json(
      {
        success: true,
        data: grades,
        statistics: {
          totalSubmissions,
          totalGraded,
          totalPending,
          averageGrade: Math.round(averageGrade * 10) / 10, // Làm tròn 1 chữ số thập phân
        },
        pageInfo: {
          nextCursor: limit ? nextCursor : null,
          hasMore: limit ? hasMore : false,
          limit: limit ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/parent/children/[childId]/grades - Error:", error);
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_CHILD_GRADES");

