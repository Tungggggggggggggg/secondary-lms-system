import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfClassroom } from "@/lib/api-utils";

interface ClassroomStudentRow {
  id: string;
  joinedAt: Date;
  student: {
    id: string;
    fullname: string | null;
    email: string;
    createdAt: Date;
  };
}

interface AssignmentIdRow {
  assignmentId: string;
}

interface SubmissionRow {
  id: string;
  assignmentId: string;
  studentId: string;
  grade: number | null;
  submittedAt: Date;
}

interface AssignmentRow {
  id: string;
}

interface ParentLinkRow {
  studentId: string;
  parent: {
    id: string;
    fullname: string;
    email: string;
  };
}

/**
 * GET /api/classrooms/[id]/students
 * Lấy danh sách học sinh trong lớp học
 * Bao gồm thống kê: số bài đã nộp, điểm trung bình, v.v.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const classroomId = params.id;

    // Optimize: Kiểm tra teacher có sở hữu classroom không (single query)
    const isOwner = await isTeacherOfClassroom(user.id, classroomId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your classroom");
    }

    // Lấy danh sách học sinh trong lớp với thông tin chi tiết
    const classroomStudents = (await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: {
        id: true,
        joinedAt: true,
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    })) as ClassroomStudentRow[];

    // Lấy tất cả assignments trong lớp này
    const assignmentIds = (await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      select: { assignmentId: true },
    })) as AssignmentIdRow[];

    const assignmentIdList = assignmentIds.map(
      (ac: AssignmentIdRow) => ac.assignmentId,
    );

    // Lấy submissions của tất cả học sinh cho các assignments trong lớp
    const studentIds = classroomStudents.map(
      (cs: ClassroomStudentRow) => cs.student.id,
    );

    const [submissionsRaw, assignmentsRaw, parentLinksRaw] = await Promise.all([
      // Lấy tất cả submissions của học sinh trong lớp
      assignmentIdList.length > 0 && studentIds.length > 0
        ? prisma.assignmentSubmission.findMany({
            where: {
              assignmentId: { in: assignmentIdList },
              studentId: { in: studentIds },
            },
            select: {
              id: true,
              assignmentId: true,
              studentId: true,
              grade: true,
              submittedAt: true,
            },
          })
        : [],
      // Lấy thông tin assignments để tính tổng số bài
      assignmentIdList.length > 0
        ? prisma.assignment.findMany({
            where: { id: { in: assignmentIdList } },
            select: { id: true },
          })
        : [],
      // Lấy danh sách phụ huynh của các học sinh trong lớp (1 query)
      studentIds.length > 0
        ? prisma.parentStudent.findMany({
            where: { studentId: { in: studentIds }, status: "ACTIVE" },
            select: {
              studentId: true,
              parent: { select: { id: true, fullname: true, email: true } },
            },
          })
        : [],
    ]);

    const submissions = submissionsRaw as SubmissionRow[];
    const assignments = assignmentsRaw as AssignmentRow[];
    const parentLinks = parentLinksRaw as ParentLinkRow[];

    // Tính toán thống kê cho từng học sinh
    const studentStats = new Map<
      string,
      {
        totalAssignments: number;
        submittedCount: number;
        gradedCount: number;
        averageGrade: number | null;
        totalGrade: number;
      }
    >();

    // Khởi tạo stats cho mỗi học sinh
    studentIds.forEach((studentId: string) => {
      studentStats.set(studentId, {
        totalAssignments: assignments.length,
        submittedCount: 0,
        gradedCount: 0,
        averageGrade: null,
        totalGrade: 0,
      });
    });

    // Tính toán từ submissions
    submissions.forEach((submission: SubmissionRow) => {
      const stats = studentStats.get(submission.studentId);
      if (stats) {
        stats.submittedCount += 1;
        if (submission.grade !== null) {
          stats.gradedCount += 1;
          stats.totalGrade += submission.grade;
        }
      }
    });

    // Tính điểm trung bình
    studentStats.forEach((stats) => {
      if (stats.gradedCount > 0) {
        stats.averageGrade = stats.totalGrade / stats.gradedCount;
      }
    });

    // Map danh sách phụ huynh theo studentId
    const parentsByStudent = new Map<
      string,
      { id: string; fullname: string; email: string }[]
    >();
    parentLinks.forEach((pl: ParentLinkRow) => {
      const arr = parentsByStudent.get(pl.studentId) || [];
      arr.push({
        id: pl.parent.id,
        fullname: pl.parent.fullname,
        email: pl.parent.email,
      });
      parentsByStudent.set(pl.studentId, arr);
    });

    // Transform data để trả về
    const students = classroomStudents.map((cs: ClassroomStudentRow) => {
      const stats = studentStats.get(cs.student.id) || {
        totalAssignments: assignments.length,
        submittedCount: 0,
        gradedCount: 0,
        averageGrade: null,
        totalGrade: 0,
      };

       const fullname = cs.student.fullname?.trim() || cs.student.email.split("@")[0] || "Học sinh";

      return {
        id: cs.student.id,
        fullname,
        email: cs.student.email,
        joinedAt: cs.joinedAt.toISOString(),
        parents: parentsByStudent.get(cs.student.id) || [],
        stats: {
          totalAssignments: stats.totalAssignments,
          submittedCount: stats.submittedCount,
          gradedCount: stats.gradedCount,
          averageGrade: stats.averageGrade
            ? Math.round(stats.averageGrade * 10) / 10
            : null,
        },
      };
    });

    return NextResponse.json(
      { success: true, data: students },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/classrooms/[id]/students - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

