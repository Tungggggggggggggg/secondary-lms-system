import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { coercePrismaJson } from '@/lib/prisma-json';
import { AssignmentData } from '@/types/assignment-builder';
import { notificationRepo } from '@/lib/repositories/notification-repo';

const quizOptionSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    label: z.string().min(1).max(10).optional(),
    content: z.string().min(1).max(5000),
    isCorrect: z.boolean().optional(),
    order: z.number().int().min(1).optional(),
  })
  .strict();

const quizQuestionSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    content: z.string().min(1).max(20_000),
    type: z.enum(['SINGLE', 'MULTIPLE', 'TRUE_FALSE', 'FILL_BLANK']),
    order: z.number().int().min(1).optional(),
    explanation: z.string().max(5000).optional(),
    options: z.array(quizOptionSchema).min(1),
  })
  .strict();

const baseSchema = z
  .object({
    type: z.enum(['ESSAY', 'QUIZ']),
    title: z.string().min(1).max(200),
    // Các field mô tả/môn học là "tùy chọn" nên cho phép null để khớp với client
    // (client đang gửi null khi để trống)
    description: z.string().max(5000).optional().nullable(),
    subject: z.string().max(200).optional().nullable(),
    classrooms: z.array(z.string().min(1).max(100)).optional(),
  })
  .strict();

const essaySchema = baseSchema.extend({
  type: z.literal('ESSAY'),
  essayContent: z
    .object({
      question: z.string().min(1).max(50_000),
      submissionFormat: z.enum(['TEXT', 'FILE', 'BOTH']).default('BOTH'),
      openAt: z.coerce.date(),
      dueDate: z.coerce.date(),
      attachments: z.array(z.unknown()).optional(),
    })
    .strict(),
});

const quizSchema = baseSchema.extend({
  type: z.literal('QUIZ'),
  quizContent: z
    .object({
      questions: z.array(quizQuestionSchema).min(1),
      timeLimitMinutes: z.coerce.number().int().min(1).max(24 * 60),
      openAt: z.coerce.date(),
      lockAt: z.coerce.date(),
      maxAttempts: z.coerce.number().int().min(1).max(100).default(1),
      antiCheatConfig: z.unknown().optional(),
    })
    .strict(),
});

const assignmentCreateSchema = z.discriminatedUnion('type', [essaySchema, quizSchema]);

type QuizOptionInput = z.infer<typeof quizOptionSchema>;
type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;

function normalizeZodIssues(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * POST /api/assignments/create
 * Tạo assignment mới với workflow cải tiến
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return errorResponse(401, 'Unauthorized');
    if (user.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required');

    const rawBody: unknown = await request.json().catch(() => null);
    const parsed = assignmentCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: normalizeZodIssues(parsed.error.issues),
      });
    }

    const assignmentData: AssignmentData = parsed.data as unknown as AssignmentData;

    // Content validation
    if (assignmentData.type === 'ESSAY') {
      const openAt = assignmentData.essayContent?.openAt;
      const dueDate = assignmentData.essayContent?.dueDate;
      if (!(openAt instanceof Date) || !(dueDate instanceof Date) || isNaN(openAt.getTime()) || isNaN(dueDate.getTime()) || openAt >= dueDate) {
        return errorResponse(400, 'Thời gian mở bài phải trước hạn nộp bài');
      }
    } else if (assignmentData.type === 'QUIZ') {
      const openAt = assignmentData.quizContent?.openAt;
      const lockAt = assignmentData.quizContent?.lockAt;
      if (!(openAt instanceof Date) || !(lockAt instanceof Date) || isNaN(openAt.getTime()) || isNaN(lockAt.getTime()) || openAt >= lockAt) {
        return errorResponse(400, 'Thời gian mở bài phải trước thời gian đóng bài');
      }
    }

    const classroomIds = Array.from(new Set(assignmentData.classrooms ?? [])).filter(Boolean);
    if (classroomIds.length > 0) {
      const owned = await prisma.classroom.findMany({
        where: { id: { in: classroomIds }, teacherId: user.id },
        select: { id: true },
      });
      if (owned.length !== classroomIds.length) {
        return errorResponse(403, 'Forbidden - Classroom access denied');
      }
    }

    // Prepare assignment data for database
    const assignmentCreateData: any = {
      title: assignmentData.title.trim(),
      description: assignmentData.description?.trim() || null,
      subject: assignmentData.subject?.trim() || null,
      type: assignmentData.type,
      authorId: user.id,
    };

    // Essay-specific fields
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent) {
      assignmentCreateData.openAt = assignmentData.essayContent.openAt;
      assignmentCreateData.dueDate = assignmentData.essayContent.dueDate;
      assignmentCreateData.submission_format = assignmentData.essayContent.submissionFormat || 'BOTH'; // Fix: use submission_format
    }

    // Quiz-specific fields
    if (assignmentData.type === 'QUIZ' && assignmentData.quizContent) {
      assignmentCreateData.openAt = assignmentData.quizContent.openAt;
      assignmentCreateData.lockAt = assignmentData.quizContent.lockAt;
      assignmentCreateData.timeLimitMinutes = assignmentData.quizContent.timeLimitMinutes;
      assignmentCreateData.max_attempts = assignmentData.quizContent.maxAttempts || 1; // Fix: use max_attempts
      if (assignmentData.quizContent.antiCheatConfig !== undefined) {
        const coerced = coercePrismaJson(assignmentData.quizContent.antiCheatConfig);
        if (coerced === undefined) {
          return errorResponse(400, 'antiCheatConfig không hợp lệ');
        }
        assignmentCreateData.anti_cheat_config = coerced;
      }
    }

    // Create assignment in database
    const assignment = await prisma.assignment.create({
      data: assignmentCreateData,
      include: {
        author: {
          select: {
            id: true,
            fullname: true,
            email: true
          }
        }
      }
    });

    // Create question for Essay
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent?.question) {
      await prisma.question.create({
        data: {
          content: assignmentData.essayContent.question,
          type: 'ESSAY',
          order: 1,
          assignmentId: assignment.id
        }
      });
    }

    // Create questions for Quiz
    if (assignmentData.type === 'QUIZ' && assignmentData.quizContent?.questions) {
      const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const normalizedQuestions = assignmentData.quizContent.questions.map((q: QuizQuestionInput) => ({
        ...q,
        content: (q.content || '').trim(),
        options: (q.options || []).map((opt: QuizOptionInput) => ({
          ...opt,
          label: opt.label,
          content: (opt.content || '').trim(),
          isCorrect: !!opt.isCorrect,
        })),
      }));

      for (let i = 0; i < normalizedQuestions.length; i++) {
        const q = normalizedQuestions[i];
        if (q.type === 'SINGLE' || q.type === 'TRUE_FALSE') {
          const correct = q.options.filter((o: QuizOptionInput) => !!o.isCorrect);
          if (correct.length !== 1) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} (${q.type}) phải có đúng 1 đáp án đúng` }, { status: 400 });
          }
          if (q.options.some((o: QuizOptionInput) => !(o.content && o.content.trim()))) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} có đáp án rỗng` }, { status: 400 });
          }
        } else if (q.type === 'FILL_BLANK') {
          const contents = q.options.map((o: QuizOptionInput) => (o.content || '').trim()).filter(Boolean);
          if (contents.length < 1) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} (FILL_BLANK) cần ít nhất 1 đáp án chấp nhận` }, { status: 400 });
          }
          const set = new Set<string>();
          for (const c of contents) {
            const key = normalize(c);
            if (set.has(key)) {
              return NextResponse.json({ success: false, message: `Câu ${i + 1} (FILL_BLANK) có đáp án trùng nhau (sau chuẩn hoá): "${c}"` }, { status: 400 });
            }
            set.add(key);
          }
          q.options = q.options.map((o) => ({ ...o, label: o.label, isCorrect: true }));
        } else {
          if (q.options.some((o: QuizOptionInput) => !(o.content && o.content.trim()))) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} có đáp án rỗng` }, { status: 400 });
          }
        }
      }

      const questionsData = normalizedQuestions.map((q, index) => ({
        content: q.content,
        type: q.type,
        order: index + 1,
        assignmentId: assignment.id,
      }));

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.question.createMany({
          data: questionsData.map((q) => ({
            content: q.content,
            type: q.type,
            order: q.order,
            assignmentId: assignment.id,
          })),
        });

        const createdQuestions = (await tx.question.findMany({
          where: { assignmentId: assignment.id },
          select: { id: true, order: true },
          orderBy: { order: 'asc' },
        })) as Array<{ id: string; order: number }>;

        const questionIdByOrder = new Map<number, string>(
          createdQuestions.map((q: { id: string; order: number }) => [q.order, q.id])
        );

        const optionsData = normalizedQuestions.flatMap((q: QuizQuestionInput, qIndex) => {
          const questionOrder = qIndex + 1;
          const questionId = questionIdByOrder.get(questionOrder);
          if (!questionId) return [];
          return q.options.map((opt: QuizOptionInput, optIndex: number) => ({
            label:
              typeof opt.label === 'string' && opt.label.trim()
                ? opt.label.trim()
                : String.fromCharCode(65 + (optIndex % 26)) + (optIndex >= 26 ? String(Math.floor(optIndex / 26) + 1) : ''),
            content: opt.content,
            isCorrect: !!opt.isCorrect,
            order: optIndex + 1,
            questionId,
          }));
        });

        if (optionsData.length > 0) {
          await tx.option.createMany({ data: optionsData });
        }
      });

    }

    // Create classroom assignments
    if (classroomIds.length > 0) {
      await prisma.assignmentClassroom.createMany({
        data: classroomIds.map((classroomId: string) => ({
          assignmentId: assignment.id,
          classroomId: classroomId
        }))
      });

      try {
        const memberships = await prisma.classroomStudent.findMany({
          where: { classroomId: { in: classroomIds } },
          select: { classroomId: true, studentId: true },
        });

        const title = `Bài tập mới: ${assignment.title}`;
        const actionUrl = `/dashboard/student/assignments/${assignment.id}`;
        await notificationRepo.addMany(
          memberships.map((m: { classroomId: string; studentId: string }) => ({
            userId: m.studentId,
            input: {
              type: "STUDENT_ASSIGNMENT_ASSIGNED",
              title,
              description: "Giáo viên đã giao một bài tập mới cho lớp của bạn.",
              actionUrl,
              dedupeKey: `assign:${m.classroomId}:${assignment.id}:${m.studentId}`,
              meta: { classroomId: m.classroomId, assignmentId: assignment.id },
            },
          }))
        );
      } catch {}
    }

    // Handle file attachments for Essay (if any)
    if (assignmentData.type === 'ESSAY' && assignmentData.essayContent?.attachments?.length) {
      const validFiles = assignmentData.essayContent.attachments.filter((file: unknown) => {
        if (!isObjectRecord(file)) return false;
        const name = file.name ?? file.fileName ?? file.originalName;
        return typeof name === 'string' && name.length > 0;
      });
      
      if (validFiles.length > 0) {
        const fileData = validFiles.map((file: unknown) => {
          const f = file as Record<string, unknown>;
          const nameRaw = f.name ?? f.fileName ?? f.originalName;
          const pathRaw = f.path ?? f.url ?? f.src;
          const sizeRaw = f.size;
          const mimeTypeRaw = f.type ?? f.mimeType;

          const name = typeof nameRaw === 'string' ? nameRaw : 'Unknown File';
          const path = typeof pathRaw === 'string' ? pathRaw.slice(0, 1024) : '';
          const size = typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? Math.max(0, Math.floor(sizeRaw)) : 0;
          const mimeType = typeof mimeTypeRaw === 'string' ? mimeTypeRaw : 'application/octet-stream';

          return {
            name,
            path,
            size,
            mimeType,
            assignmentId: assignment.id,
            uploadedById: user.id,
            file_type: 'ATTACHMENT',
          };
        });
        
        try {
          await prisma.assignmentFile.createMany({
            data: fileData
          });
        } catch (fileError) {
          console.error('[CreateAssignment] Error creating file records:', fileError);
          // Don't fail the entire assignment creation if file creation fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tạo bài tập thành công',
      data: {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        createdAt: assignment.createdAt,
        author: assignment.author
      }
    });

  } catch (error: unknown) {
    console.error(`[CreateAssignment] Error after ${Date.now() - startTime}ms:`, error);
    return errorResponse(500, 'Lỗi server khi tạo bài tập');
  }
}
