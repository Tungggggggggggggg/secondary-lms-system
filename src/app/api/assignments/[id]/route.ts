import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, type AssignmentType, type QuestionType } from '@prisma/client'
import { z } from 'zod'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'

const ALLOWED_QUESTION_TYPES = [
  'SINGLE',
  'MULTIPLE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'ESSAY',
] as const;

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

const updateOptionSchema = z
  .object({
    label: z.string().optional(),
    content: z.string().optional(),
    isCorrect: z.boolean().optional(),
    order: z.number().int().min(1).optional(),
  })
  .passthrough();

const updateQuestionSchema = z
  .object({
    content: z.string().optional(),
    type: z.string().optional(),
    order: z.number().int().min(1).optional(),
    options: z.array(updateOptionSchema).optional(),
  })
  .passthrough();

const putBodySchema = z
  .object({
    title: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional().nullable(),
    dueDate: z.union([z.string(), z.date()]).optional().nullable(),
    openAt: z.union([z.string(), z.date()]).optional().nullable(),
    lockAt: z.union([z.string(), z.date()]).optional().nullable(),
    timeLimitMinutes: z.number().optional().nullable(),
    subject: z.string().optional().nullable(),
    maxAttempts: z.number().optional(),
    antiCheatConfig: z.unknown().optional(),
    submissionFormat: z.string().optional(),
    classrooms: z.array(z.string()).optional(),
    questions: z.array(updateQuestionSchema).optional(),
  })
  .passthrough();

function normalizeZodIssues(issues: z.ZodIssue[]): string {
  return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNestedJsonValue(value: unknown, depth = 0): Prisma.InputJsonValue | null | undefined {
  if (depth > 20) return undefined
  if (value === null) return null

  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'bigint' || t === 'symbol' || t === 'function' || t === 'undefined') return undefined

  if (Array.isArray(value)) {
    const arr: Array<Prisma.InputJsonValue | null> = []
    for (const item of value) {
      const v = toNestedJsonValue(item, depth + 1)
      if (v === undefined) return undefined
      arr.push(v)
    }
    return arr
  }

  if (isRecord(value)) {
    const obj: Record<string, Prisma.InputJsonValue | null> = {}
    for (const [k, vUnknown] of Object.entries(value)) {
      const v = toNestedJsonValue(vUnknown, depth + 1)
      if (v === undefined) return undefined
      obj[k] = v
    }
    return obj
  }

  return undefined
}

function coerceJsonForPrisma(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined
  const nested = toNestedJsonValue(value)
  if (nested === undefined) return undefined
  if (nested === null) return Prisma.JsonNull
  return nested
}

// Lấy chi tiết bài tập (chỉ giáo viên chủ sở hữu)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substr(2, 9)
  
  try {
    const me = await getAuthenticatedUser(req)
    if (!me) return errorResponse(401, 'Unauthorized', { requestId })
    if (me.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required', { requestId })

    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) {
      return errorResponse(400, 'Invalid assignment ID', {
        requestId,
        details: normalizeZodIssues(parsedParams.error.issues),
      })
    }

    const assignmentId = parsedParams.data.id

    // Database query với error handling
    let assignment
    try {
      assignment = await prisma.assignment.findFirst({
        where: { 
          id: assignmentId, 
          authorId: me.id 
        },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          dueDate: true,
          openAt: true,
          lockAt: true,
          timeLimitMinutes: true,
          subject: true,
          submission_format: true,
          max_attempts: true,
          anti_cheat_config: true,
          createdAt: true,
          updatedAt: true,
          classrooms: {
            select: {
              classroomId: true
            }
          },
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
                  order: true
                },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        },
      })
    } catch (dbError) {
      console.error(`[ASSIGNMENT GET ${requestId}] Database error:`, dbError)
      return errorResponse(500, 'Database query failed', { requestId })
    }
    
    if (!assignment) {
      return errorResponse(404, 'Assignment not found or you do not have permission to access it', { requestId })
    }
    
    const totalTime = Date.now() - startTime

    const normalized = (() => {
      if (assignment.type === 'QUIZ') {
        const timeLimit = assignment.timeLimitMinutes ?? 30
        const lockAt = assignment.lockAt ?? assignment.dueDate ?? null
        let openAt = assignment.openAt ?? null
        if (!openAt && lockAt) {
          const lock = new Date(lockAt)
          openAt = new Date(lock.getTime() - (timeLimit + 5) * 60_000)
        }
        return { ...assignment, lockAt, openAt }
      }
      return assignment
    })()
    
    return NextResponse.json({ 
      success: true, 
      data: normalized,
      meta: {
        requestId,
        responseTime: `${totalTime}ms`
      }
    }, { status: 200 })
    
  } catch (error: unknown) {
    console.error(
      `[ASSIGNMENT GET ${requestId}] Unexpected error after ${Date.now() - startTime}ms:`,
      error,
    );
    return errorResponse(500, 'Internal server error', { requestId })
  }
}

// Xóa bài tập (chỉ giáo viên chủ sở hữu)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getAuthenticatedUser(req)
    if (!me) return errorResponse(401, 'Unauthorized')
    if (me.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required')

    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) {
      return errorResponse(400, 'Invalid assignment ID', { details: normalizeZodIssues(parsedParams.error.issues) })
    }

    const assignmentId = parsedParams.data.id

    const exists = await prisma.assignment.findFirst({ where: { id: assignmentId, authorId: me.id }, select: { id: true } })
    if (!exists) {
      return errorResponse(404, 'Not found')
    }

    await prisma.assignment.delete({ where: { id: assignmentId } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: unknown) {
    console.error('[ASSIGNMENT DELETE] Error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

// CẬP NHẬT bài tập (PUT)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getAuthenticatedUser(req)
    if (!me) return errorResponse(401, 'Unauthorized')
    if (me.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required')

    const parsedParams = paramsSchema.safeParse(params)
    if (!parsedParams.success) {
      return errorResponse(400, 'Invalid assignment ID', { details: normalizeZodIssues(parsedParams.error.issues) })
    }

    const assignmentId = parsedParams.data.id
    // Kiểm tra ownership assignment
    const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, authorId: me.id } });
    if (!assignment) {
      return errorResponse(404, 'Not found');
    }
    // Parse body
    const rawBody: unknown = await req.json().catch(() => null)
    const parsedBody = putBodySchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', { details: normalizeZodIssues(parsedBody.error.issues) })
    }

    const { title, description, dueDate, type, questions, openAt, lockAt, timeLimitMinutes, subject, maxAttempts, antiCheatConfig, submissionFormat, classrooms } = parsedBody.data;
    // Chuẩn hoá type về dạng chuỗi in hoa (ESSAY, QUIZ, ...)
    const normalizedTypeStr = typeof type === 'string' ? type.trim().toUpperCase() : '';
    if (normalizedTypeStr !== 'ESSAY' && normalizedTypeStr !== 'QUIZ') {
      return errorResponse(400, 'Loại bài tập không hợp lệ')
    }
    const normalizedType: AssignmentType = normalizedTypeStr;
    const updateData: Prisma.AssignmentUncheckedUpdateInput = {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      type: normalizedType,
      updatedAt: new Date(),
      openAt: openAt ? new Date(openAt) : null,
      lockAt: lockAt ? new Date(lockAt) : null,
      timeLimitMinutes: typeof timeLimitMinutes === 'number' ? timeLimitMinutes : null,
      subject: typeof subject === 'string' ? subject : null,
    };
    // Các trường đặc thù theo loại bài tập
    if (normalizedType === 'ESSAY') {
      if (typeof submissionFormat === 'string') {
        updateData.submission_format = submissionFormat;
      }
    }
    if (normalizedType === 'QUIZ') {
      if (typeof maxAttempts === 'number') {
        updateData.max_attempts = maxAttempts;
      }
      if (antiCheatConfig !== undefined) {
        const coerced = coerceJsonForPrisma(antiCheatConfig)
        if (coerced === undefined) {
          return errorResponse(400, 'antiCheatConfig không hợp lệ')
        }
        updateData.anti_cheat_config = coerced
      }
    }

    if (normalizedType === 'ESSAY') {
      if (!openAt || !dueDate) {
        return errorResponse(400, 'Thời gian mở bài và hạn nộp là bắt buộc');
      }
      const _open = new Date(openAt);
      const _due = new Date(dueDate);
      if (isNaN(_open.getTime()) || isNaN(_due.getTime()) || _open >= _due) {
        return errorResponse(400, 'Thời gian mở bài phải trước hạn nộp bài');
      }
      updateData.openAt = _open;
      updateData.dueDate = _due;
    }
    if (normalizedType === 'QUIZ') {
      if (!openAt || !lockAt) {
        return errorResponse(400, 'Thời gian mở bài và đóng bài là bắt buộc');
      }
      const _open = new Date(openAt);
      const _lock = new Date(lockAt);
      if (isNaN(_open.getTime()) || isNaN(_lock.getTime()) || _open >= _lock) {
        return errorResponse(400, 'Thời gian mở bài phải trước thời gian đóng bài');
      }
      updateData.openAt = _open;
      updateData.lockAt = _lock;
    }
    // Validation server-side cho QUIZ questions nếu có
    let normalizedQuestions: Array<{ content: string; type: string; order?: number; options?: Array<{ label: string; content: string; isCorrect: boolean; order?: number }> }> | null = null;
    if (normalizedType === 'QUIZ' && questions && Array.isArray(questions)) {
      const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      normalizedQuestions = questions.map((qUnknown) => {
        const q = isRecord(qUnknown) ? qUnknown : {}
        const optionsUnknown = Array.isArray(q.options) ? q.options : []

        return {
          content: typeof q.content === 'string' ? q.content.trim() : '',
          type: typeof q.type === 'string' ? q.type.toUpperCase() : '',
          order: typeof q.order === 'number' ? q.order : undefined,
          options: optionsUnknown.map((oUnknown) => {
            const o = isRecord(oUnknown) ? oUnknown : {}
            return {
              label: typeof o.label === 'string' ? o.label : '',
              content: typeof o.content === 'string' ? o.content.trim() : '',
              isCorrect: !!o.isCorrect,
              order: typeof o.order === 'number' ? o.order : undefined,
            }
          }),
        }
      });

      for (let i = 0; i < normalizedQuestions.length; i++) {
        const q = normalizedQuestions[i];
        if (!ALLOWED_QUESTION_TYPES.includes(q.type as (typeof ALLOWED_QUESTION_TYPES)[number])) {
          return errorResponse(400, `Câu ${i + 1} có kiểu không hợp lệ: ${q.type}`);
        }
        if (q.type === 'SINGLE' || q.type === 'TRUE_FALSE') {
          const correct = (q.options || []).filter((o) => !!o.isCorrect);
          if (correct.length !== 1) {
            return errorResponse(400, `Câu ${i + 1} (${q.type}) phải có đúng 1 đáp án đúng`);
          }
          if ((q.options || []).some((o) => !(o.content && o.content.trim()))) {
            return errorResponse(400, `Câu ${i + 1} có đáp án rỗng`);
          }
        } else if (q.type === 'FILL_BLANK') {
          const contents = (q.options || []).map((o) => (o.content || '').trim()).filter(Boolean);
          if (contents.length < 1) {
            return errorResponse(400, `Câu ${i + 1} (FILL_BLANK) cần ít nhất 1 đáp án chấp nhận`);
          }
          const set = new Set<string>();
          for (const c of contents) {
            const key = normalize(c);
            if (set.has(key)) {
              return errorResponse(400, `Câu ${i + 1} (FILL_BLANK) có đáp án trùng nhau (sau chuẩn hoá): "${c}"`);
            }
            set.add(key);
          }
          if (q.options) q.options = q.options.map((o) => ({ ...o, isCorrect: true }));
        } else {
          if ((q.options || []).some((o) => !(o.content && o.content.trim()))) {
            return errorResponse(400, `Câu ${i + 1} có đáp án rỗng`);
          }
        }
      }
    }

    // Nếu truyền questions: cập nhật lại toàn bộ câu hỏi và đáp án (xoá hết cũ, insert mới)
    let updatedAssignment;
    try {
      updatedAssignment = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Cập nhật assignment metadata
        await tx.assignment.update({
          where: { id: assignmentId },
          data: updateData,
        });
        if (questions && Array.isArray(questions)) {
          // Xoá hết câu hỏi cũ
          await tx.question.deleteMany({ where: { assignmentId } });
          // Thêm lại câu hỏi mới
          const qs = normalizedQuestions ?? questions;
          for (const [qIndex, q] of qs.entries()) {
            const contentValue = typeof q?.content === 'string' ? q.content : '';
            const questionTypeValue = typeof q?.type === 'string' ? q.type : '';
            const orderValue = typeof q?.order === 'number' ? q.order : undefined;
            const optionsValue = Array.isArray(q?.options) ? q.options : undefined;
            const qTypeUpperStr = (typeof questionTypeValue === 'string' ? questionTypeValue.toUpperCase() : '') as QuestionType;
            if (!ALLOWED_QUESTION_TYPES.includes(qTypeUpperStr as (typeof ALLOWED_QUESTION_TYPES)[number])) {
              throw new Error(`Invalid question type at index ${qIndex}`);
            }
            const newQuestion = await tx.question.create({
              data: {
                assignmentId,
                content: contentValue,
                type: qTypeUpperStr,
                order: orderValue ?? qIndex + 1,
              }
            });
            // Nếu có options (trắc nghiệm): thêm đáp án
            if (qTypeUpperStr !== 'ESSAY' && optionsValue && Array.isArray(optionsValue) && optionsValue.length > 0) {
              await tx.option.createMany({
                data: optionsValue.map((opt, oIdx: number) => ({
                  questionId: newQuestion.id,
                  label: typeof opt?.label === 'string' ? opt.label : '',
                  content: typeof opt?.content === 'string' ? opt.content : '',
                  isCorrect: !!opt?.isCorrect,
                  order: typeof opt?.order === 'number' ? opt.order : oIdx + 1,
                })),
              });
            }
          }
        }
        // Nếu có classrooms: cập nhật lại bảng AssignmentClassroom
        if (Array.isArray(classrooms)) {
          await tx.assignmentClassroom.deleteMany({ where: { assignmentId } });
          if (classrooms.length > 0) {
            const owned = await tx.classroom.findMany({
              where: { id: { in: classrooms as string[] }, teacherId: me.id },
              select: { id: true },
            })
            if (owned.length !== classrooms.length) {
              throw new Error('Forbidden - Classroom access denied')
            }
            await tx.assignmentClassroom.createMany({
              data: classrooms.map((classroomId: string) => ({
                assignmentId,
                classroomId,
              }))
            });
          }
        }
        // Trả lại chi tiết assignment mới sau cập nhật
        return tx.assignment.findFirst({
          where: { id: assignmentId },
          include: { questions: { include: { options: true } }, _count: { select: { submissions: true } }, classrooms: true },
        });
      }, { timeout: 30000, maxWait: 5000 });
    } catch (err) {
      console.error('[ASSIGNMENT PUT] Lỗi khi cập nhật assignment:', err);
      return errorResponse(500, 'Lỗi hệ thống khi cập nhật bài tập');
    }
    return NextResponse.json({ success: true, message: 'Cập nhật bài tập thành công', data: updatedAssignment }, { status: 200 });
  } catch (error: unknown) {
    console.error('[ASSIGNMENT PUT] Error:', error)
    return errorResponse(500, 'Lỗi hệ thống khi cập nhật bài tập');
  }
}

