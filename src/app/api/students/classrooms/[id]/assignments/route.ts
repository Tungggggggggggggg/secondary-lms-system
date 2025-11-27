import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Student role required" },
        { status: 403 }
      );
    }

    const classroomId = params.id;

    // Kiểm tra student có tham gia classroom không
    const isMember = await prisma.classroomStudent.findFirst({
      where: {
        classroomId,
        studentId: user.id,
      },
    });

    if (!isMember) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this classroom",
        },
        { status: 403 }
      );
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

    console.log(
      `[INFO] [GET] /api/students/classrooms/${classroomId}/assignments - Found ${assignments.length} assignments for student: ${user.id}`
    );

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/classrooms/[id]/assignments - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
