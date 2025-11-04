import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

/**
 * POST /api/students/assignments/[id]/submit
 * Student submit assignment
 */
export async function POST(
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
    const body = await req.json();
    const { content, answers, newAttempt } = body as {
      content?: string;
      answers?: Array<{ questionId: string; optionIds: string[] }>;
      newAttempt?: boolean;
    };

    // Optimize: Parallel queries - Kiểm tra classroom membership + lấy assignment
    const [classroomId, assignment] = await Promise.all([
      getStudentClassroomForAssignment(user.id, assignmentId),
      prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          title: true,
          type: true,
          dueDate: true,
          questions: {
            select: {
              id: true,
              type: true,
              order: true,
              options: {
                select: {
                  id: true,
                  isCorrect: true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      }),
    ]);

    if (!classroomId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - You are not a member of this assignment's classroom",
        },
        { status: 403 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "Assignment not found" },
        { status: 404 }
      );
    }

    // Validate dựa trên loại assignment
    if (assignment.type === "ESSAY") {
      if (!content || !content.trim()) {
        return NextResponse.json(
          { success: false, message: "Content is required for essay assignments" },
          { status: 400 }
        );
      }
    } else if (assignment.type === "QUIZ") {
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return NextResponse.json(
          { success: false, message: "Answers are required for quiz assignments" },
          { status: 400 }
        );
      }
      // Validate số lượng câu trả lời phải bằng số lượng câu hỏi
      if (answers.length !== assignment.questions.length) {
        return NextResponse.json(
          {
            success: false,
            message: `Expected ${assignment.questions.length} answers, got ${answers.length}`,
          },
          { status: 400 }
        );
      }
      // Validate tất cả questions đều có answer
      const answeredQuestionIds = new Set(answers.map((a) => a.questionId));
      const questionIds = new Set(assignment.questions.map((q) => q.id));
      if (
        answeredQuestionIds.size !== questionIds.size ||
        !Array.from(questionIds).every((id) => answeredQuestionIds.has(id))
      ) {
        return NextResponse.json(
          { success: false, message: "All questions must be answered" },
          { status: 400 }
        );
      }
    }

    // Tìm attempt hiện tại (nếu có)
    const latestSubmission = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId, studentId: user.id },
      orderBy: { attempt: "desc" },
      select: { id: true, attempt: true, grade: true },
    });

    // Kiểm tra deadline (nếu có)
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Assignment deadline has passed",
        },
        { status: 400 }
      );
    }

    // Tính điểm tự động cho quiz
    let calculatedGrade: number | null = null;
    let submissionContent = "";

    if (assignment.type === "QUIZ" && answers) {
      // Tính điểm cho quiz
      let totalScore = 0;
      let totalQuestions = assignment.questions.length;

      for (const question of assignment.questions) {
        const answer = answers.find((a) => a.questionId === question.id);
        if (!answer) continue;

        const correctOptionIds = question.options
          .filter((opt) => opt.isCorrect)
          .map((opt) => opt.id)
          .sort();

        const selectedOptionIds = [...answer.optionIds].sort();

        // So sánh arrays
        if (
          correctOptionIds.length === selectedOptionIds.length &&
          correctOptionIds.every((id, idx) => id === selectedOptionIds[idx])
        ) {
          totalScore += 1;
        }
      }

      // Tính điểm trên thang 10
      calculatedGrade = (totalScore / totalQuestions) * 10;

      // Lưu answers dưới dạng JSON string
      submissionContent = JSON.stringify(answers);
    } else if (assignment.type === "ESSAY" && content) {
      submissionContent = content.trim();
    }

    // Tạo submission (multi-attempts: nếu đã có -> tăng attempt)
    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId: user.id,
        content: submissionContent,
        grade: calculatedGrade, // Auto-grade cho quiz
        attempt: (latestSubmission?.attempt ?? 0) + 1,
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
          },
        },
      },
    });

    console.log(
      `[INFO] [POST] /api/students/assignments/${assignmentId}/submit - Student ${user.id} submitted attempt ${(latestSubmission?.attempt ?? 0) + 1} (${assignment.type})${calculatedGrade !== null ? ` with auto-grade: ${calculatedGrade.toFixed(2)}` : ""}`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          assignment.type === "QUIZ" && calculatedGrade !== null
            ? `Assignment submitted successfully. Your score: ${calculatedGrade.toFixed(2)}/10`
            : "Assignment submitted successfully",
        data: {
          ...submission,
          grade: calculatedGrade, // Include grade in response for quiz
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [POST] /api/students/assignments/[id]/submit - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/students/assignments/[id]/submit
 * Student update submission (chỉ khi chưa được chấm)
 */
export async function PUT(
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
    const body = await req.json();
    const { content, answers } = body as {
      content?: string;
      answers?: Array<{ questionId: string; optionIds: string[] }>;
    };

    // Tìm submission của student
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: user.id,
      },
      include: {
        assignment: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: false, message: "Submission not found" },
        { status: 404 }
      );
    }

    // Không cho update nếu đã được chấm (có grade)
    if (submission.grade !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot update submission that has been graded",
        },
        { status: 403 }
      );
    }

    // Validate dựa trên loại assignment
    let submissionContent = "";
    if (submission.assignment.type === "ESSAY") {
      if (!content || !content.trim()) {
        return NextResponse.json(
          { success: false, message: "Content is required for essay assignments" },
          { status: 400 }
        );
      }
      submissionContent = content.trim();
    } else if (submission.assignment.type === "QUIZ") {
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return NextResponse.json(
          { success: false, message: "Answers are required for quiz assignments" },
          { status: 400 }
        );
      }
      // Validate số lượng câu trả lời phải bằng số lượng câu hỏi
      if (answers.length !== submission.assignment.questions.length) {
        return NextResponse.json(
          {
            success: false,
            message: `Expected ${submission.assignment.questions.length} answers, got ${answers.length}`,
          },
          { status: 400 }
        );
      }
      // Validate tất cả questions đều có answer
      const answeredQuestionIds = new Set(answers.map((a) => a.questionId));
      const questionIds = new Set(submission.assignment.questions.map((q) => q.id));
      if (
        answeredQuestionIds.size !== questionIds.size ||
        !Array.from(questionIds).every((id) => answeredQuestionIds.has(id))
      ) {
        return NextResponse.json(
          { success: false, message: "All questions must be answered" },
          { status: 400 }
        );
      }
      // Lưu answers dưới dạng JSON string
      submissionContent = JSON.stringify(answers);
    }

    // Update submission
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        content: submissionContent,
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
          },
        },
      },
    });

    console.log(
      `[INFO] [PUT] /api/students/assignments/${assignmentId}/submit - Student ${user.id} updated submission`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Submission updated successfully",
        data: updatedSubmission,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [PUT] /api/students/assignments/[id]/submit - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


