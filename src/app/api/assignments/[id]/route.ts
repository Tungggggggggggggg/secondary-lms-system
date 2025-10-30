import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma, UserRole, AssignmentType, QuestionType } from '@prisma/client'

// Lấy chi tiết bài tập (chỉ giáo viên chủ sở hữu)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!me || me.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: params.id, authorId: me.id },
      include: { questions: { include: { options: true, comments: true } }, _count: { select: { submissions: true } } },
    })
    if (!assignment) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: assignment }, { status: 200 })
  } catch (error) {
    console.error('[ASSIGNMENT GET] Error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
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
    if (!me || me.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const exists = await prisma.assignment.findFirst({ where: { id: params.id, authorId: me.id }, select: { id: true } })
    if (!exists) {
      return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
    }

    await prisma.assignment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[ASSIGNMENT DELETE] Prisma known error:', error.code, error.message, error.meta)
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[ASSIGNMENT DELETE] Prisma validation error:', error.message)
    } else if (error instanceof Error) {
      console.error('[ASSIGNMENT DELETE] Unexpected error:', error.message, error.stack)
    } else {
      console.error('[ASSIGNMENT DELETE] Unknown error:', error)
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
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
    if (!me || me.role !== UserRole.TEACHER) {
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
    } catch (error) {
      console.error('[ASSIGNMENT PUT] Body parse error:', error);
      return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
    }
    const { title, description, dueDate, type, questions } = body || {};
    if (!title || !type) {
      return NextResponse.json({ success: false, message: 'Thiếu trường bắt buộc title/type' }, { status: 400 });
    }
    // type cần về đúng enum
    const normalizedType = (typeof type === 'string' ? type.toUpperCase() : '') as AssignmentType;
    const updateData = {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      type: normalizedType,
      updatedAt: new Date(),
    };
    // Nếu truyền questions: cập nhật lại toàn bộ câu hỏi và đáp án (xoá hết cũ, insert mới)
    let updatedAssignment;
    try {
      updatedAssignment = await prisma.$transaction(async (tx) => {
        // Cập nhật assignment metadata
        await tx.assignment.update({
          where: { id: params.id },
          data: updateData,
        });
        if (questions && Array.isArray(questions)) {
          // Xoá hết câu hỏi cũ
          await tx.question.deleteMany({ where: { assignmentId: params.id } });
          // Thêm lại câu hỏi mới
          for (const [qIndex, q] of questions.entries()) {
            const { content, type: questionType, order, options } = q;
            // Cho phép ESSAY|SINGLE|MULTIPLE
            const qTypeUpper = (typeof questionType === 'string' ? questionType.toUpperCase() : '') as string;
            if (!Object.values(QuestionType).includes(qTypeUpper as any)) {
              throw new Error(`Invalid question type at index ${qIndex}`);
            }
            const newQuestion = await tx.question.create({
              data: {
                assignmentId: params.id,
                content,
                type: qTypeUpper as any,
                order: order ?? qIndex + 1,
              }
            });
            // Nếu có options (trắc nghiệm): thêm đáp án
            if (qTypeUpper !== 'ESSAY' && options && Array.isArray(options) && options.length > 0) {
              for (const [oIdx, opt] of options.entries()) {
                await tx.option.create({
                  data: {
                    questionId: newQuestion.id,
                    label: opt.label || '',
                    content: opt.content || '',
                    isCorrect: !!opt.isCorrect,
                    order: typeof opt.order === 'number' ? opt.order : oIdx + 1, // Đảm bảo luôn có thứ tự rõ ràng cho đáp án
                  },
                });
              }
            }
          }
        }
        // Trả lại chi tiết assignment mới sau cập nhật
        return tx.assignment.findFirst({
          where: { id: params.id },
          include: { questions: { include: { options: true } }, _count: { select: { submissions: true } } },
        });
      });
    } catch (err) {
      console.error('[ASSIGNMENT PUT] Lỗi khi cập nhật assignment:', err);
      return NextResponse.json({ success: false, message: 'Lỗi hệ thống khi cập nhật bài tập' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Cập nhật bài tập thành công', data: updatedAssignment }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[ASSIGNMENT PUT] Prisma known error:', error.code, error.message, error.meta);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[ASSIGNMENT PUT] Prisma validation error:', error.message);
    } else if (error instanceof Error) {
      console.error('[ASSIGNMENT PUT] Unexpected error:', error.message, error.stack);
    } else {
      console.error('[ASSIGNMENT PUT] Unknown error:', error);
    }
    return NextResponse.json({ success: false, message: 'Lỗi hệ thống khi cập nhật bài tập' }, { status: 500 });
  }
}

