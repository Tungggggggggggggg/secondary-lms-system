import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getCachedUser } from '@/lib/user-cache'
import type { Prisma, QuestionType } from '@prisma/client'

const ALLOWED_QUESTION_TYPES = [
  'SINGLE',
  'MULTIPLE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'ESSAY',
] as const;

// Lấy chi tiết bài tập (chỉ giáo viên chủ sở hữu)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substr(2, 9)
  
  try {
    // Validate params
    if (!params.id || typeof params.id !== 'string') {
      console.error(`[ASSIGNMENT GET ${requestId}] Invalid ID parameter:`, params.id)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid assignment ID' 
      }, { status: 400 })
    }
    
    // Check session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 })
    }
    
    // Get user with caching
    const me = await getCachedUser(session.user.id, session.user.email || undefined)
    if (!me) {
      console.error(`[ASSIGNMENT GET ${requestId}] User not found: ${session.user.id}`)
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 })
    }
    
    if (me.role !== 'TEACHER') {
      console.error(`[ASSIGNMENT GET ${requestId}] Access denied - User role: ${me.role}`)
      return NextResponse.json({ 
        success: false, 
        message: 'Teacher access required' 
      }, { status: 403 })
    }

    // Database query với error handling
    let assignment
    try {
      assignment = await prisma.assignment.findFirst({
        where: { 
          id: params.id, 
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
      return NextResponse.json({ 
        success: false, 
        message: 'Database query failed' 
      }, { status: 500 })
    }
    
    if (!assignment) {
      console.log(`[ASSIGNMENT GET ${requestId}] Assignment not found or access denied - ID: ${params.id}, Author: ${me.id}`)
      return NextResponse.json({ 
        success: false, 
        message: 'Assignment not found or you do not have permission to access it' 
      }, { status: 404 })
    }
    
    const totalTime = Date.now() - startTime
    if (totalTime > 2000) {
      console.log(`[ASSIGNMENT GET ${requestId}] Slow response - Total time: ${totalTime}ms`)
    }

    const normalized = (() => {
      const a: any = assignment as any
      if (a?.type === 'QUIZ') {
        const timeLimit = a.timeLimitMinutes ?? 30
        const lockAt = a.lockAt ?? a.dueDate ?? null
        let openAt = a.openAt ?? null
        if (!openAt && lockAt) {
          const lock = new Date(lockAt)
          openAt = new Date(lock.getTime() - (timeLimit + 5) * 60_000)
        }
        return { ...a, lockAt, openAt }
      }
      return a
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

    if (error instanceof Error) {
      console.error(`[ASSIGNMENT GET ${requestId}] Error message:`, error.message);
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}

// Xóa bài tập (chỉ giáo viên chủ sở hữu)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!me || me.role !== 'TEACHER') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const exists = await prisma.assignment.findFirst({ where: { id: params.id, authorId: me.id }, select: { id: true } })
    if (!exists) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    await prisma.assignment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[ASSIGNMENT DELETE] Error:', error.message, error.stack);
    } else {
      console.error('[ASSIGNMENT DELETE] Unknown error:', error);
    }
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 })
  }
}

// CẬP NHẬT bài tập (PUT)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!me || me.role !== 'TEACHER') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }
    // Kiểm tra ownership assignment
    const assignment = await prisma.assignment.findFirst({ where: { id: params.id, authorId: me.id } });
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    }
    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (error: unknown) {
      console.error('[ASSIGNMENT PUT] Body parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON body';
      return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
    }
    const { title, description, dueDate, type, questions, openAt, lockAt, timeLimitMinutes, subject, maxAttempts, antiCheatConfig, submissionFormat, classrooms } = body || {};
    if (!title || !type) {
      return NextResponse.json({ success: false, message: 'Thiếu trường bắt buộc title/type' }, { status: 400 });
    }
    // Chuẩn hoá type về dạng chuỗi in hoa (ESSAY, QUIZ, ...)
    const normalizedType = (typeof type === 'string' ? type.toUpperCase() : '');
    const updateData: Record<string, unknown> = {
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
        updateData.anti_cheat_config = antiCheatConfig;
      }
    }

    if (normalizedType === 'ESSAY') {
      if (!openAt || !dueDate) {
        return NextResponse.json({ success: false, message: 'Thời gian mở bài và hạn nộp là bắt buộc' }, { status: 400 });
      }
      const _open = new Date(openAt);
      const _due = new Date(dueDate);
      if (isNaN(_open.getTime()) || isNaN(_due.getTime()) || _open >= _due) {
        return NextResponse.json({ success: false, message: 'Thời gian mở bài phải trước hạn nộp bài' }, { status: 400 });
      }
      updateData.openAt = _open;
      updateData.dueDate = _due;
    }
    if (normalizedType === 'QUIZ') {
      if (!openAt || !lockAt) {
        return NextResponse.json({ success: false, message: 'Thời gian mở bài và đóng bài là bắt buộc' }, { status: 400 });
      }
      const _open = new Date(openAt);
      const _lock = new Date(lockAt);
      if (isNaN(_open.getTime()) || isNaN(_lock.getTime()) || _open >= _lock) {
        return NextResponse.json({ success: false, message: 'Thời gian mở bài phải trước thời gian đóng bài' }, { status: 400 });
      }
      updateData.openAt = _open;
      updateData.lockAt = _lock;
    }
    // Validation server-side cho QUIZ questions nếu có
    let normalizedQuestions: Array<{ content: string; type: string; order?: number; options?: Array<{ label: string; content: string; isCorrect: boolean; order?: number }> }> | null = null;
    if (normalizedType === 'QUIZ' && questions && Array.isArray(questions)) {
      const normalize = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      normalizedQuestions = questions.map((q: any) => ({
        ...q,
        content: (q?.content || '').trim(),
        type: (typeof q?.type === 'string' ? q.type.toUpperCase() : ''),
        options: (q?.options || []).map((o: any) => ({
          label: o?.label || '',
          content: (o?.content || '').trim(),
          isCorrect: !!o?.isCorrect,
          order: typeof o?.order === 'number' ? o.order : undefined,
        })),
      }));

      for (let i = 0; i < normalizedQuestions.length; i++) {
        const q = normalizedQuestions[i];
        if (!ALLOWED_QUESTION_TYPES.includes(q.type as any)) {
          return NextResponse.json({ success: false, message: `Câu ${i + 1} có kiểu không hợp lệ: ${q.type}` }, { status: 400 });
        }
        if (q.type === 'SINGLE' || q.type === 'TRUE_FALSE') {
          const correct = (q.options || []).filter((o) => !!o.isCorrect);
          if (correct.length !== 1) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} (${q.type}) phải có đúng 1 đáp án đúng` }, { status: 400 });
          }
          if ((q.options || []).some((o) => !(o.content && o.content.trim()))) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} có đáp án rỗng` }, { status: 400 });
          }
        } else if (q.type === 'FILL_BLANK') {
          const contents = (q.options || []).map((o) => (o.content || '').trim()).filter(Boolean);
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
          if (q.options) q.options = q.options.map((o) => ({ ...o, isCorrect: true }));
        } else {
          if ((q.options || []).some((o) => !(o.content && o.content.trim()))) {
            return NextResponse.json({ success: false, message: `Câu ${i + 1} có đáp án rỗng` }, { status: 400 });
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
          where: { id: params.id },
          // Dùng any để tránh phụ thuộc vào type Prisma cụ thể (AssignmentUpdateInput có thể thay đổi theo schema)
          data: updateData as any,
        });
        if (questions && Array.isArray(questions)) {
          // Xoá hết câu hỏi cũ
          await tx.question.deleteMany({ where: { assignmentId: params.id } });
          // Thêm lại câu hỏi mới
          const qs = normalizedQuestions ?? questions;
          for (const [qIndex, q] of qs.entries()) {
            const { content, type: questionType, order, options } = q as any;
            const qTypeUpperStr = (typeof questionType === 'string' ? questionType.toUpperCase() : '') as QuestionType;
            if (!ALLOWED_QUESTION_TYPES.includes(qTypeUpperStr as any)) {
              throw new Error(`Invalid question type at index ${qIndex}`);
            }
            const newQuestion = await tx.question.create({
              data: {
                assignmentId: params.id,
                content,
                type: qTypeUpperStr,
                order: order ?? qIndex + 1,
              }
            });
            // Nếu có options (trắc nghiệm): thêm đáp án
            if (qTypeUpperStr !== 'ESSAY' && options && Array.isArray(options) && options.length > 0) {
              await tx.option.createMany({
                data: (options as any[]).map((opt: any, oIdx: number) => ({
                  questionId: newQuestion.id,
                  label: opt?.label || '',
                  content: opt?.content || '',
                  isCorrect: !!opt?.isCorrect,
                  order: typeof opt?.order === 'number' ? opt.order : oIdx + 1,
                })),
              });
            }
          }
        }
        // Nếu có classrooms: cập nhật lại bảng AssignmentClassroom
        if (Array.isArray(classrooms)) {
          await tx.assignmentClassroom.deleteMany({ where: { assignmentId: params.id } });
          if (classrooms.length > 0) {
            await tx.assignmentClassroom.createMany({
              data: classrooms.map((classroomId: string) => ({
                assignmentId: params.id,
                classroomId,
              }))
            });
          }
        }
        // Trả lại chi tiết assignment mới sau cập nhật
        return tx.assignment.findFirst({
          where: { id: params.id },
          include: { questions: { include: { options: true } }, _count: { select: { submissions: true } }, classrooms: true },
        });
      }, { timeout: 30000, maxWait: 5000 });
    } catch (err) {
      console.error('[ASSIGNMENT PUT] Lỗi khi cập nhật assignment:', err);
      return NextResponse.json({ success: false, message: 'Lỗi hệ thống khi cập nhật bài tập' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Cập nhật bài tập thành công', data: updatedAssignment }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[ASSIGNMENT PUT] Error:', error.message, error.stack);
    } else {
      console.error('[ASSIGNMENT PUT] Unknown error:', error);
    }
    const errorMessage = error instanceof Error ? error.message : 'Lỗi hệ thống khi cập nhật bài tập';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}

