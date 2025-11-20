import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";
import { autoGradeQuiz, validateQuizSubmission } from "@/lib/auto-grade";
import crypto from "crypto";

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
    const { content, answers, presentation } = body as {
      content?: string;
      answers?: Array<{ questionId: string; optionIds: string[] }>;
      presentation?: { questionOrder: string[]; optionOrder: Record<string, string[]>; seed?: number | string; versionHash?: string };
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
          updatedAt: true,
          questions: {
            select: {
              id: true,
              content: true,
              type: true,
              order: true,
              options: {
                select: {
                  id: true,
                  label: true,
                  content: true,
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
    let contentSnapshot: any = null;

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
        
        // Fallback to partial credit (MULTIPLE) with penalty alpha=0.5
        const penaltyAlpha = 0.5;
        let scoreSum = 0;
        const totalQuestions = assignment.questions.length;

        for (const question of assignment.questions) {
          const answer = answers.find((a) => a.questionId === question.id);
          if (!answer) continue;

          const correctOptionIds = question.options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.id);

          const selectedOptionIds = [...answer.optionIds];

          let qScore = 0;
          if (question.type === 'SINGLE' || question.type === 'TRUE_FALSE') {
            const ok = (correctOptionIds.length === selectedOptionIds.length) && correctOptionIds.every(id => selectedOptionIds.includes(id));
            qScore = ok ? 1 : 0;
          } else if (question.type === 'MULTIPLE') {
            const correctSet = new Set(correctOptionIds);
            const selectedSet = new Set(selectedOptionIds);
            let TP = 0, FP = 0;
            selectedSet.forEach(id => { if (correctSet.has(id)) TP++; else FP++; });
            const T = correctOptionIds.length || 1;
            qScore = Math.max(0, Math.min(1, (TP - penaltyAlpha * FP) / T));
          } else if (question.type === 'FILL_BLANK') {
            qScore = selectedOptionIds.some(id => correctOptionIds.includes(id)) ? 1 : 0;
          }
          scoreSum += qScore;
        }

        // Tính điểm trên thang 10 theo tổng điểm fractional
        calculatedGrade = Math.round(((scoreSum / totalQuestions) * 10) * 10) / 10;
        autoFeedback = `Tự động chấm (fallback): ${Math.round(scoreSum * 100) / 100}/${totalQuestions} điểm câu (${Math.round((scoreSum/totalQuestions)*100)}%)`;

        // Lưu answers dưới dạng JSON string
        submissionContent = JSON.stringify(answers);
      }

      // Tạo contentSnapshot để freeze nội dung đề tại thời điểm nộp
      try {
        const snapshotQuestions = assignment.questions.map((q) => ({
          id: q.id,
          content: (q as any).content,
          type: q.type,
          options: (q.options || []).map((o) => ({
            id: o.id,
            label: (o as any).label,
            content: (o as any).content,
            isCorrect: o.isCorrect,
          })),
        }));
        const versionHash = crypto
          .createHash("sha256")
          .update(JSON.stringify({ assignmentId: assignment.id, questions: snapshotQuestions }))
          .digest("hex")
          .slice(0, 12);
        contentSnapshot = { versionHash, questions: snapshotQuestions };
      } catch (e) {
        console.error("[SUBMIT] Không thể tạo contentSnapshot:", e);
        contentSnapshot = null;
      }
    } else if (assignment.type === "ESSAY" && content) {
      submissionContent = content.trim();
    }

    // Tạo submission (multi-attempts: nếu đã có -> tăng attempt)
    const dataToCreate: any = {
      assignmentId,
      studentId: user.id,
      content: submissionContent,
      grade: calculatedGrade, // Auto-grade cho quiz
      feedback: autoFeedback, // Auto-feedback cho quiz
      attempt: nextAttempt,
    };
    if (presentation) {
      dataToCreate.presentation = presentation as any;
    }
    if (assignment.type === "QUIZ" && contentSnapshot) {
      dataToCreate.contentSnapshot = contentSnapshot as any;
    }
    const submission = await prisma.assignmentSubmission.create({
      data: dataToCreate,
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
    let calculatedGrade: number | null = null;
    let autoFeedback: string | null = null;
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
      // Validate tất cả questions đều có answer (theo questionId)
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

      // Auto-chấm lại quiz cho lần cập nhật
      try {
        const quizSubmission = validateQuizSubmission({
          assignmentId,
          studentId: user.id,
          answers: answers.map((a) => ({
            questionId: a.questionId,
            selectedOptions: a.optionIds,
          })),
        });

        const gradeResult = await autoGradeQuiz(quizSubmission, true);
        calculatedGrade = gradeResult.grade;
        autoFeedback = gradeResult.feedback;
      } catch (autoGradeError) {
        console.error('[AUTO_GRADE][PUT] Error auto-grading quiz:', autoGradeError);
        // Fallback đơn giản: không tính lại điểm, để giáo viên quyết định
        calculatedGrade = null;
        autoFeedback = null;
      }

      // Lưu answers dưới dạng JSON string
      submissionContent = JSON.stringify(answers);
    }

    // Update submission (và grade/feedback nếu là quiz)
    const updateData: any = {
      content: submissionContent,
    };
    if (submission.assignment.type === "QUIZ") {
      updateData.grade = calculatedGrade;
      updateData.feedback = autoFeedback;
    }

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: updateData,
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


