import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

interface StudentAssignmentSubmissionRow {
  id: string;
  assignmentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}

interface StudentAssignmentRow {
  addedAt: Date;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    openAt: Date | null;
    lockAt: Date | null;
    timeLimitMinutes: number | null;
    type: string;
    createdAt: Date;
    updatedAt: Date;
  };
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
 * GET /api/students/assignments
 * Lấy danh sách assignments từ tất cả classrooms mà student đã tham gia
 * Bao gồm thông tin submission của student (nếu có)
 * OPTIMIZED: Parallel queries, select thay vì include
 */
export async function GET(req: NextRequest) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    // OPTIMIZE: Lấy classrooms trước, sau đó filter trực tiếp thay vì nested some()
    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      select: { classroomId: true },
    });

    const classroomIds = studentClassrooms.map(
      (sc: { classroomId: string }) => sc.classroomId,
    );

    if (classroomIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    // OPTIMIZE: Query trực tiếp với classroomId IN thay vì nested some() - sử dụng index
    const allAssignments = (await prisma.assignmentClassroom.findMany({
      where: {
        classroomId: { in: classroomIds },
      },
      select: {
        addedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            dueDate: true,
            openAt: true,
            lockAt: true,
            timeLimitMinutes: true,
            type: true,
            createdAt: true,
            updatedAt: true,
            // OPTIMIZE: Loại bỏ _count để tránh expensive queries
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            teacher: {
              select: { id: true, fullname: true, email: true },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    })) as StudentAssignmentRow[];

    if (allAssignments.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    const assignmentIds = allAssignments.map(
      (ac: StudentAssignmentRow) => ac.assignment.id,
    );

    // OPTIMIZE: Fetch submissions song song với counts (nếu cần) cho tất cả assignments
    const [studentSubmissionsRaw] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: {
          assignmentId: { in: assignmentIds },
          studentId: user.id,
        },
        select: {
          id: true,
          assignmentId: true,
          content: true,
          grade: true,
          feedback: true,
          submittedAt: true,
        },
      }),
      // Counts có thể được fetch riêng nếu cần, nhưng tạm thời bỏ qua để tối ưu
    ]);

    const studentSubmissions =
      studentSubmissionsRaw as StudentAssignmentSubmissionRow[];

    // Tạo map để lookup submission nhanh
    const submissionMap = new Map<string, StudentAssignmentSubmissionRow>();
    studentSubmissions.forEach((sub: StudentAssignmentSubmissionRow) => {
      submissionMap.set(sub.assignmentId, sub);
    });

    // Transform data để trả về (optimize: sử dụng classroom từ join)
    const assignments = allAssignments.map((ac: StudentAssignmentRow) => {
      const assignment = ac.assignment;
      const submission = submissionMap.get(assignment.id);
      const classroom = ac.classroom;

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        openAt: assignment.openAt,
        lockAt: assignment.lockAt ?? assignment.dueDate,
        timeLimitMinutes: assignment.timeLimitMinutes,
        type: assignment.type,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        // OPTIMIZE: _count đã được loại bỏ để tăng tốc độ query
        _count: { submissions: 0, questions: 0 }, // Placeholder - có thể fetch riêng nếu cần
        // Thông tin classroom (từ join)
        classroom: {
          id: classroom.id,
          name: classroom.name,
          code: classroom.code,
          icon: classroom.icon,
          teacher: classroom.teacher,
        },
        // Thông tin submission của student
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              grade: submission.grade,
              feedback: submission.feedback,
              submittedAt: submission.submittedAt.toISOString(),
            }
          : null,
        // Trạng thái dựa trên hạn hiệu lực (QUIZ: lockAt; ESSAY: dueDate)
        status: (() => {
          if (submission) return "submitted" as const;
          const effective = assignment.lockAt ?? assignment.dueDate;
          if (effective && new Date(effective) < new Date()) return "overdue" as const;
          return "pending" as const;
        })(),
      };
    });

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
