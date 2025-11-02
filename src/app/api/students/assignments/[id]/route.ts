import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

/**
 * GET /api/students/assignments/[id]
 * Lấy chi tiết assignment cho student (bao gồm questions, options nhưng KHÔNG có isCorrect)
 * COMBINED: Cũng trả về submission của student nếu có (giảm từ 2 requests xuống 1)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.STUDENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;

    // Optimize: Kiểm tra student có trong classroom nào có assignment này không (single query)
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    // Parallel queries: Assignment detail + Submission + Classroom info trong cùng lúc
    const [assignmentData, submission, classroom] = await Promise.all([
      // Lấy assignment detail
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, fullname: true, email: true },
          },
          questions: {
            select: {
              id: true,
              content: true,
              type: true,
              order: true,
              options: {
                select: {
                  // KHÔNG select isCorrect để student không biết đáp án đúng
                  id: true,
                  label: true,
                  content: true,
                  order: true,
                },
                orderBy: { order: "asc" },
              },
              _count: {
                select: { comments: true },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: { submissions: true, questions: true },
          },
        },
      }),
      // Lấy submission của student (nếu có)
      prisma.assignmentSubmission.findFirst({
        where: {
          assignmentId,
          studentId: user.id,
        },
        select: {
          id: true,
          content: true,
          grade: true,
          feedback: true,
          submittedAt: true,
        },
      }),
      // Lấy classroom info
      prisma.classroom.findUnique({
        where: { id: classroomId },
        select: {
          id: true,
          name: true,
          code: true,
          icon: true,
          teacher: {
            select: { id: true, fullname: true, email: true },
          },
        },
      }),
    ]);

    if (!assignmentData) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    if (!classroom) {
      return NextResponse.json(
        { success: false, message: "Classroom not found" },
        { status: 404 }
      );
    }

    // Transform data để trả về (kèm submission)
    const assignmentDetail = {
      id: assignmentData.id,
      title: assignmentData.title,
      description: assignmentData.description,
      dueDate: assignmentData.dueDate,
      type: assignmentData.type,
      createdAt: assignmentData.createdAt,
      updatedAt: assignmentData.updatedAt,
      author: assignmentData.author,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        icon: classroom.icon,
        teacher: classroom.teacher,
      },
      questions: assignmentData.questions.map((q) => ({
        id: q.id,
        content: q.content,
        type: q.type,
        order: q.order,
        options: q.options, // Options KHÔNG có isCorrect
        _count: q._count,
      })),
      _count: assignmentData._count,
      // Include submission trong response (COMBINED)
      submission: submission
        ? {
            id: submission.id,
            content: submission.content,
            grade: submission.grade,
            feedback: submission.feedback,
            submittedAt: submission.submittedAt.toISOString(),
          }
        : null,
    };

    console.log(
      `[INFO] [GET] /api/students/assignments/${assignmentId} - Student ${user.id} viewed assignment (with submission: ${!!submission})`
    );

    return NextResponse.json(
      { success: true, data: assignmentDetail },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id] - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


