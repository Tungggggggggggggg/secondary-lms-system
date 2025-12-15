import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

interface StudentClassroomAssignmentRow {
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
    _count: {
      submissions: number;
      questions: number;
    };
  };
}

interface StudentClassroomSubmissionRow {
  id: string;
  assignmentId: string;
  content: string | null;
  grade: number | null;
  feedback: string | null;
  submittedAt: Date;
}

/**
 * GET /api/students/classrooms/[id]/assignments
 * Lấy danh sách assignments của một classroom mà student đã tham gia
 * Bao gồm thông tin submission của student (nếu có)
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

    // Lấy danh sách assignments đã được thêm vào classroom
    const assignmentClassrooms = (await prisma.assignmentClassroom.findMany({
      where: { classroomId },
      include: {
        assignment: {
          include: {
            _count: {
              select: {
                submissions: true,
                questions: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    })) as StudentClassroomAssignmentRow[];

    // Lấy submissions của student cho các assignments này
    const assignmentIds = assignmentClassrooms.map(
      (ac: StudentClassroomAssignmentRow) => ac.assignment.id,
    );

    const studentSubmissionsRaw = await prisma.assignmentSubmission.findMany({
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
    });

    const studentSubmissions =
      studentSubmissionsRaw as StudentClassroomSubmissionRow[];

    // Tạo map để lookup submission nhanh
    const submissionMap = new Map<string, StudentClassroomSubmissionRow>();
    studentSubmissions.forEach((sub: StudentClassroomSubmissionRow) => {
      submissionMap.set(sub.assignmentId, sub);
    });

    // Transform data để trả về
    const assignments = assignmentClassrooms.map(
      (ac: StudentClassroomAssignmentRow) => {
      const assignment = ac.assignment;
      const submission = submissionMap.get(assignment.id);

      return {
        ...assignment,
        addedAt: ac.addedAt.toISOString(),
        _count: assignment._count,
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
        // Trạng thái
        status: submission
          ? "submitted"
          : assignment.dueDate && new Date(assignment.dueDate) < new Date()
          ? "overdue"
          : "pending",
      };
    });

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/classrooms/[id]/assignments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
