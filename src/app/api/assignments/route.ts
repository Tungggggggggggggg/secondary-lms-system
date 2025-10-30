import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma, AssignmentType, QuestionType, UserRole } from '@prisma/client'

// Lấy danh sách bài tập theo giáo viên hiện tại - TỐI ƯU SELECT + pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Chỉ giáo viên mới có danh sách bài tập (tạo)
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    // Phân trang từ query param
    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const take = url?.searchParams.get('take') ? Number(url?.searchParams.get('take')) : 10;
    const skip = url?.searchParams.get('skip') ? Number(url?.searchParams.get('skip')) : 0;
    // Truy vấn TỐI ƯU SELECT chỉ trường cần, bỏ include dư thừa
    const assignments = await prisma.assignment.findMany({
      where: { authorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { submissions: true, questions: true } }
      }
    });

    return NextResponse.json({ success: true, data: assignments }, { status: 200 })
  } catch (error) {
    console.error('[ASSIGNMENTS GET] Error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// Tạo bài tập mới (essay hoặc quiz)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!me || me.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: false, message: 'Forbidden - Teacher only' }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, dueDate, type, questions } = body as {
      title?: string
      description?: string
      dueDate?: string | null
      type?: string
      questions?: Array<{ content: string; type: string; options: Array<{ label: string; content: string; isCorrect: boolean }>; order: number }>
    }

    if (!title || !type) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const normalizedType = type.toUpperCase()
    if (!Object.values(AssignmentType).includes(normalizedType as AssignmentType)) {
      return NextResponse.json({ success: false, message: 'Invalid assignment type' }, { status: 400 })
    }

    // Chuẩn bị data tạo
    const data: Prisma.AssignmentCreateInput = {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      type: normalizedType as AssignmentType,
      author: { connect: { id: me.id } },
    }

    // Nếu là quiz, validate câu hỏi và phương án
    if (data.type === AssignmentType.QUIZ) {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ success: false, message: 'Quiz requires at least 1 question' }, { status: 400 })
      }

      data.questions = {
        create: questions.map((q, idx) => {
          const qType = (q.type || 'SINGLE').toUpperCase()
          if (!Object.values(QuestionType).includes(qType as QuestionType)) {
            throw new Error(`Invalid question type at index ${idx}`)
          }
          if (!q.options || q.options.length < 2) {
            throw new Error(`Question ${idx + 1} must have at least 2 options`)
          }
          const numCorrect = q.options.filter(o => !!o.isCorrect).length
          if (qType === 'SINGLE' && numCorrect !== 1) {
            throw new Error(`Question ${idx + 1} (SINGLE) must have exactly 1 correct option`)
          }
          if (qType === 'MULTIPLE' && numCorrect < 1) {
            throw new Error(`Question ${idx + 1} (MULTIPLE) must have at least 1 correct option`)
          }
          return {
            content: q.content,
            type: qType as QuestionType,
            order: typeof q.order === 'number' ? q.order : idx + 1,
            options: {
              create: q.options.map((opt, j) => ({
                label: opt.label || String.fromCharCode(65 + j),
                content: opt.content,
                isCorrect: !!opt.isCorrect,
                order: j + 1,
              })),
            },
          }
        }),
      }
    }

    const created = await prisma.assignment.create({
      data,
      include: { questions: { include: { options: true } } },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[ASSIGNMENTS POST] Prisma known error:', error.code, error.message, error.meta)
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[ASSIGNMENTS POST] Prisma validation error:', error.message)
    } else if (error instanceof Error) {
      console.error('[ASSIGNMENTS POST] Unexpected error:', error.message, error.stack)
    } else {
      console.error('[ASSIGNMENTS POST] Unknown error:', error)
    }
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

