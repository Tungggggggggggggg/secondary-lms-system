import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";
import { autoGradeQuiz, validateQuizSubmission } from "@/lib/auto-grade";
import crypto from "crypto";
import { notificationRepo } from "@/lib/repositories/notification-repo";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

const answerSchema = z
  .object({
    questionId: z.string().min(1).max(100),
    optionIds: z.array(z.string().min(1).max(100)).default([]),
  })
  .strict();

const presentationSchema = z
  .object({
    questionOrder: z.array(z.string().min(1).max(100)),
    optionOrder: z.record(z.string(), z.array(z.string().min(1).max(100))),
    seed: z.union([z.number(), z.string()]).optional(),
    versionHash: z.string().min(1).max(100).optional(),
  })
  .strict();

const postBodySchema = z
  .object({
    content: z.string().max(100_000).optional(),
    answers: z.array(answerSchema).optional(),
    presentation: presentationSchema.optional(),
    newAttempt: z.boolean().optional(),
  })
  .strict();

const putBodySchema = z
  .object({
    content: z.string().max(100_000).optional(),
    answers: z.array(answerSchema).optional(),
  })
  .strict();

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

    const assignmentId = parsedParams.data.id;

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const { content, answers, presentation } = parsedBody.data;

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
      return errorResponse(403, "Forbidden - You are not a member of this assignment's classroom");
    }

    if (!assignment) {
      return errorResponse(404, "Assignment not found");
    }

    // Validate dựa trên loại assignment
    if (assignment.type === "ESSAY") {
      if (!content || !content.trim()) {
        return errorResponse(400, "Content is required for essay assignments");
      }
    } else if (assignment.type === "QUIZ") {
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return errorResponse(400, "Answers are required for quiz assignments");
      }
      // Validate số lượng câu trả lời phải bằng số lượng câu hỏi
      if (answers.length !== assignment.questions.length) {
        return errorResponse(
          400,
          `Expected ${assignment.questions.length} answers, got ${answers.length}`
        );
      }
      // Validate tất cả questions đều có answer
      const answeredQuestionIds = new Set<string>(
        answers.map((a) => a.questionId),
      );
      const questionIds = new Set<string>(
        assignment.questions.map((q: { id: string }) => q.id),
      );
      if (
        answeredQuestionIds.size !== questionIds.size ||
        !Array.from(questionIds).every(
          (id: string) => answeredQuestionIds.has(id),
        )
      ) {
        return errorResponse(400, "All questions must be answered");
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
        return errorResponse(
          403,
          `Bạn đã vượt quá số lần làm tối đa (${maxAttempts}). Không thể nộp thêm lần mới.`
        );
      }
    }

    // Kiểm tra deadline (nếu có)
    if (assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
      return errorResponse(400, "Assignment deadline has passed");
    }

    // Tính điểm tự động cho quiz bằng auto-grade utility
    let calculatedGrade: number | null = null;
    let autoFeedback: string | null = null;
    let submissionContent = "";
    let contentSnapshot: unknown | null = null;

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
            .filter(
              (opt: { id: string; isCorrect: boolean }) => opt.isCorrect,
            )
            .map((opt: { id: string }) => opt.id);

          const selectedOptionIds = [...answer.optionIds];

          let qScore = 0;
          if (question.type === 'SINGLE' || question.type === 'TRUE_FALSE') {
            const ok =
              correctOptionIds.length === selectedOptionIds.length &&
              correctOptionIds.every((id: string) =>
                selectedOptionIds.includes(id),
              );
            qScore = ok ? 1 : 0;
          } else if (question.type === 'MULTIPLE') {
            const correctSet = new Set(correctOptionIds);
            const selectedSet = new Set(selectedOptionIds);
            let TP = 0, FP = 0;
            selectedSet.forEach((id: string) => {
              if (correctSet.has(id)) TP++;
              else FP++;
            });
            const T = correctOptionIds.length || 1;
            qScore = Math.max(0, Math.min(1, (TP - penaltyAlpha * FP) / T));
          } else if (question.type === 'FILL_BLANK') {
            qScore = selectedOptionIds.some((id: string) =>
              correctOptionIds.includes(id),
            )
              ? 1
              : 0;
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
        const snapshotQuestions = assignment.questions.map((q: any) => ({
          id: q.id,
          content: q.content,
          type: q.type,
          order: q.order,
          options: q.options.map((opt: any) => ({
            id: opt.id,
            label: opt.label,
            content: opt.content,
            isCorrect: opt.isCorrect,
            order: opt.order,
          })),
        }));
        const versionHash = crypto
          .createHash("sha256")
          .update(JSON.stringify({ assignmentId: assignment.id, questions: snapshotQuestions }))
          .digest("hex")
          .slice(0, 12);
        contentSnapshot = { versionHash, questions: snapshotQuestions } as any;
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
      ...(presentation ? { presentation: presentation as any } : {}),
      ...(assignment.type === "QUIZ" && contentSnapshot ? { contentSnapshot } : {}),
    };
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

    try {
      const assignmentRow = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, title: true, authorId: true },
      });

      if (assignmentRow?.authorId) {
        const needsGrading = assignment.type === "ESSAY" && calculatedGrade === null;
        await notificationRepo.add(assignmentRow.authorId, {
          type: needsGrading ? "TEACHER_SUBMISSION_NEED_GRADING" : "TEACHER_SUBMISSION_NEW",
          title: needsGrading
            ? `Cần chấm bài: ${assignmentRow.title}`
            : `Bài nộp mới: ${assignmentRow.title}`,
          description: "Có học sinh vừa nộp bài.",
          actionUrl: `/dashboard/teacher/assignments/${assignmentId}/submissions`,
          dedupeKey: `subNew:${assignmentId}:${user.id}:${nextAttempt}`,
          meta: { assignmentId, studentId: user.id, attempt: nextAttempt },
        });
      }
    } catch {}

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

    // Ghi thêm examEvent để trang giám sát thi nhận biết phiên đã hoàn thành
    try {
      await prisma.examEvent.create({
        data: {
          assignmentId,
          studentId: user.id,
          attempt: nextAttempt,
          eventType: "SESSION_COMPLETED",
          metadata: {
            source: "SUBMIT_API",
            submissionId: submission.id,
            attemptNumber: nextAttempt,
            grade: calculatedGrade,
            autoFeedback,
          } as any,
        },
      });
    } catch (e) {
      console.error("[SUBMIT] Failed to create SESSION_COMPLETED examEvent", e);
    }

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
    return errorResponse(500, "Internal server error");
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

    const assignmentId = parsedParams.data.id;

    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = putBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const { content, answers } = parsedBody.data;

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
      return errorResponse(404, "Submission not found");
    }

    // Không cho update nếu đã được chấm (có grade)
    if (submission.grade !== null) {
      return errorResponse(403, "Cannot update submission that has been graded");
    }

    // Validate dựa trên loại assignment
    let submissionContent = "";
    let calculatedGrade: number | null = null;
    let autoFeedback: string | null = null;
    if (submission.assignment.type === "ESSAY") {
      if (!content || !content.trim()) {
        return errorResponse(400, "Content is required for essay assignments");
      }
      submissionContent = content.trim();
    } else if (submission.assignment.type === "QUIZ") {
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return errorResponse(400, "Answers are required for quiz assignments");
      }
      // Validate số lượng câu trả lời phải bằng số lượng câu hỏi
      if (answers.length !== submission.assignment.questions.length) {
        return errorResponse(
          400,
          `Expected ${submission.assignment.questions.length} answers, got ${answers.length}`
        );
      }
      // Validate tất cả questions đều có answer (theo questionId)
      const answeredQuestionIds = new Set<string>(
        answers.map((a) => a.questionId),
      );
      const questionIds = new Set<string>(
        submission.assignment.questions.map((q: { id: string }) => q.id),
      );
      if (
        answeredQuestionIds.size !== questionIds.size ||
        !Array.from(questionIds).every(
          (id: string) => answeredQuestionIds.has(id),
        )
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
    return errorResponse(500, "Internal server error");
  }
}


