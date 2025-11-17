import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";
import { autoGradeQuiz, validateQuizSubmission } from "@/lib/auto-grade";

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
    const { content, answers } = body as {
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
          max_attempts: true,
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

    const nextAttempt = (latestSubmission?.attempt ?? 0) + 1;
    if (assignment.type === "QUIZ") {
      const maxAttempts = assignment.max_attempts ?? 1;
      if (nextAttempt > maxAttempts) {
        return NextResponse.json(
          {
            success: false,
            message: `Bạn đã vượt quá số lần làm tối đa (${maxAttempts}). Không thể nộp thêm lần mới.`,
          },
          { status: 403 }
        );
      }
    }

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

    // Tính điểm tự động cho quiz bằng auto-grade utility
    let calculatedGrade: number | null = null;
    let autoFeedback: string | null = null;
    let submissionContent = "";

    if (assignment.type === "QUIZ" && answers) {
      try {
        // Validate quiz submission format
        const quizSubmission = validateQuizSubmission({
          assignmentId,
          studentId: user.id,
          answers: answers.map(answer => ({
            questionId: answer.questionId,
            selectedOptions: answer.optionIds
          }))
        });

        // Auto-grade quiz
        const gradeResult = await autoGradeQuiz(quizSubmission, true);
        
        calculatedGrade = gradeResult.grade;
        autoFeedback = gradeResult.feedback;

        // Lưu answers dưới dạng JSON string
        submissionContent = JSON.stringify(answers);

        console.log(`[AUTO_GRADE] Quiz auto-graded: ${gradeResult.correctCount}/${gradeResult.totalQuestions} correct, grade: ${calculatedGrade}`);

      } catch (autoGradeError) {
        console.error('[AUTO_GRADE] Error auto-grading quiz:', autoGradeError);
        
        // Fallback to simple calculation if auto-grade fails
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
        autoFeedback = `Tự động chấm: ${totalScore}/${totalQuestions} câu đúng (${Math.round((totalScore/totalQuestions)*100)}%)`;

        // Lưu answers dưới dạng JSON string
        submissionContent = JSON.stringify(answers);
      }
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
        feedback: autoFeedback, // Auto-feedback cho quiz
        attempt: nextAttempt,
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

    // Đánh dấu AssignmentAttempt đã kết thúc cho attempt hiện tại nếu tồn tại
    try {
      await prisma.assignmentAttempt.updateMany({
        where: {
          assignmentId,
          studentId: user.id,
          attemptNumber: nextAttempt,
          endedAt: null,
        },
        data: {
          endedAt: new Date(),
          status: 'SUBMITTED',
        },
      });
    } catch {}

    console.log(
      `[INFO] [POST] /api/students/assignments/${assignmentId}/submit - Student ${user.id} submitted attempt ${(latestSubmission?.attempt ?? 0) + 1} (${assignment.type})${calculatedGrade !== null ? ` with auto-grade: ${calculatedGrade.toFixed(2)}` : ""}`
    );

    return NextResponse.json(
      {
        success: true,
        message:
          assignment.type === "QUIZ" && calculatedGrade !== null
            ? `Bài quiz đã được nộp và chấm điểm tự động! Điểm của bạn: ${calculatedGrade.toFixed(1)}/10`
            : "Bài tập đã được nộp thành công",
        data: {
          ...submission,
          grade: calculatedGrade, // Include grade in response for quiz
          feedback: autoFeedback, // Include feedback in response for quiz
          autoGraded: assignment.type === "QUIZ" && calculatedGrade !== null, // Flag để frontend biết đã auto-grade
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/students/assignments/[id]/submit - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
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
  } catch (error: unknown) {
    console.error(
      "[ERROR] [PUT] /api/students/assignments/[id]/submit - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}


