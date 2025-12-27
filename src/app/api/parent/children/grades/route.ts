import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { getEffectiveDeadline, isAssignmentOverdue } from "@/lib/grades/assignmentDeadline";

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
  lockAt: Date | null;
}

interface ParentChildAssignmentClassroomRow {
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

type ParentChildRelationshipRow = {
  studentId: string;
  student: {
    id: string;
    email: string;
    fullname: string | null;
    role: string;
  };
};

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
    const relationships = (await prisma.parentStudent.findMany({
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
    })) as unknown as ParentChildRelationshipRow[];

    if (relationships.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          statistics: {
            totalChildren: 0,
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            overallAverage: 0,
          },
        },
        { status: 200 }
      );
    }

    const studentIds = relationships.map(
      (rel: { studentId: string }) => rel.studentId,
    );

    const now = new Date();

    const classroomLinks = (await prisma.classroomStudent.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, classroomId: true },
    })) as Array<{ studentId: string; classroomId: string }>;

    const classroomIds = Array.from(new Set(classroomLinks.map((x) => x.classroomId)));
    if (classroomIds.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: relationships.map((rel) => ({
            student: rel.student,
            grades: [],
            statistics: {
              totalSubmissions: 0,
              totalGraded: 0,
              totalPending: 0,
              averageGrade: 0,
            },
          })),
          statistics: {
            totalChildren: relationships.length,
            totalSubmissions: 0,
            totalGraded: 0,
            totalPending: 0,
            overallAverage: 0,
          },
        },
        { status: 200 }
      );
    }

    const assignmentClassrooms = (await prisma.assignmentClassroom.findMany({
      where: { classroomId: { in: classroomIds } },
      select: {
        assignmentId: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
            lockAt: true,
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
    })) as unknown as Array<ParentChildAssignmentClassroomRow & { assignment: ParentChildAssignmentRow }>;

    const assignmentIdSet = new Set<string>(assignmentClassrooms.map((x) => x.assignmentId));
    const assignmentIds = Array.from(assignmentIdSet);

    const submissions = (await prisma.assignmentSubmission.findMany({
      where: {
        studentId: { in: studentIds },
        assignmentId: { in: assignmentIds },
      },
      select: {
        id: true,
        studentId: true,
        assignmentId: true,
        grade: true,
        feedback: true,
        submittedAt: true,
      },
      orderBy: [{ attempt: "desc" }, { submittedAt: "desc" }],
    })) as ParentChildSubmissionRow[];

    const studentClassroomIds = new Map<string, Set<string>>();
    for (const link of classroomLinks) {
      if (!studentClassroomIds.has(link.studentId)) studentClassroomIds.set(link.studentId, new Set());
      studentClassroomIds.get(link.studentId)!.add(link.classroomId);
    }

    const classroomAssignmentIds = new Map<string, string[]>();
    for (const row of assignmentClassrooms) {
      const cid = row.classroom.id;
      if (!classroomAssignmentIds.has(cid)) classroomAssignmentIds.set(cid, []);
      classroomAssignmentIds.get(cid)!.push(row.assignmentId);
    }

    const assignmentById = new Map<string, ParentChildAssignmentRow>();
    const classroomByAssignmentId = new Map<string, ParentChildAssignmentClassroomRow["classroom"]>();
    for (const row of assignmentClassrooms) {
      if (!assignmentById.has(row.assignmentId)) assignmentById.set(row.assignmentId, row.assignment);
      if (!classroomByAssignmentId.has(row.assignmentId)) classroomByAssignmentId.set(row.assignmentId, row.classroom);
    }

    const submissionByStudent = new Map<string, Map<string, ParentChildSubmissionRow>>();
    for (const sub of submissions) {
      if (!submissionByStudent.has(sub.studentId)) submissionByStudent.set(sub.studentId, new Map());
      const map = submissionByStudent.get(sub.studentId)!;
      if (!map.has(sub.assignmentId)) {
        map.set(sub.assignmentId, sub);
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
          submittedAt: string | null;
          status: "pending" | "submitted" | "graded";
          classroom: {
            id: string;
            name: string;
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
    let overallTotalAssignments = 0;
    let overallGradeSum = 0;
    let overallGradedCount = 0;
    let overallMissingOverdueCount = 0;

    for (const studentId of Object.keys(gradesByStudent)) {
      const clsIds = studentClassroomIds.get(studentId) ?? new Set<string>();
      const assignmentIdsForStudent = new Set<string>();
      for (const cid of clsIds) {
        const aIds = classroomAssignmentIds.get(cid) ?? [];
        for (const aid of aIds) assignmentIdsForStudent.add(aid);
      }

      const totalAssignments = assignmentIdsForStudent.size;
      overallTotalAssignments += totalAssignments;

      const subMap = submissionByStudent.get(studentId) ?? new Map<string, ParentChildSubmissionRow>();

      let gradeSum = 0;
      let gradedCount = 0;
      let missingOverdueCount = 0;

      for (const assignmentId of assignmentIdsForStudent) {
        const assignment = assignmentById.get(assignmentId);
        if (!assignment) continue;
        const classroom = classroomByAssignmentId.get(assignmentId) ?? null;
        const sub = subMap.get(assignmentId);

        if (sub) {
          const effectiveDeadline = getEffectiveDeadline(assignment);
          gradesByStudent[studentId].grades.push({
            id: sub.id,
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            assignmentType: assignment.type,
            dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
            grade: sub.grade,
            feedback: sub.feedback,
            submittedAt: sub.submittedAt.toISOString(),
            status: (sub.grade !== null ? "graded" : "submitted") as "pending" | "submitted" | "graded",
            classroom: classroom
              ? {
                  id: classroom.id,
                  name: classroom.name,
                  icon: classroom.icon,
                  teacher: classroom.teacher,
                }
              : null,
          });

          if (sub.grade !== null) {
            gradedCount += 1;
            gradeSum += sub.grade;
          }
        } else {
          const isPastDue = isAssignmentOverdue(assignment, now);
          if (isPastDue) {
            const effectiveDeadline = getEffectiveDeadline(assignment);
            gradesByStudent[studentId].grades.push({
              id: `virtual-${assignment.id}`,
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              assignmentType: assignment.type,
              dueDate: effectiveDeadline ? effectiveDeadline.toISOString() : null,
              grade: 0,
              feedback: null,
              submittedAt: null,
              status: "graded" as "pending" | "submitted" | "graded",
              classroom: classroom
                ? {
                    id: classroom.id,
                    name: classroom.name,
                    icon: classroom.icon,
                    teacher: classroom.teacher,
                  }
                : null,
            });

            missingOverdueCount += 1;
          }
        }
      }

      gradesByStudent[studentId].grades.sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });

      const denom = gradedCount + missingOverdueCount;
      const averageGrade = denom > 0 ? gradeSum / denom : 0;
      const totalGraded = denom;
      const totalPending = Math.max(0, totalAssignments - totalGraded);

      gradesByStudent[studentId].statistics = {
        totalSubmissions: totalAssignments,
        totalGraded,
        totalPending,
        averageGrade: Math.round(averageGrade * 10) / 10,
      };

      overallGradeSum += gradeSum;
      overallGradedCount += gradedCount;
      overallMissingOverdueCount += missingOverdueCount;
    }

    const result = Object.values(gradesByStudent);
    const denom = overallGradedCount + overallMissingOverdueCount;
    const overallAverage = denom > 0 ? overallGradeSum / denom : 0;
    const overallStatistics = {
      totalChildren: result.length,
      totalSubmissions: overallTotalAssignments,
      totalGraded: denom,
      totalPending: Math.max(0, overallTotalAssignments - denom),
      overallAverage: Math.round(overallAverage * 10) / 10,
    };

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
    return errorResponse(500, "Internal server error");
  }
}, "PARENT_ALL_CHILDREN_GRADES");

