import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma, AssignmentType, QuestionType, UserRole } from '@prisma/client'
import { createAssignmentSchema, paginationSchema } from '@/types/api'
import { getCachedUser } from '@/lib/user-cache'
import { withPerformanceTracking } from '@/lib/performance-monitor'

// Lấy danh sách bài tập theo giáo viên hiện tại - TỐI ƯU SELECT + pagination + user cache + performance tracking
export async function GET(req: NextRequest) {
  return withPerformanceTracking('/api/assignments', 'GET', async () => {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // ✅ SỬ DỤNG CACHE CHO USER LOOKUP - Giảm từ 208ms xuống <50ms
    const user = await getCachedUser(
      session.user.id || undefined, 
      session.user.email || undefined
    )

    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 })
    }

    const url = req?.url ? new URL(req.url, 'http://localhost') : null;
    const takeParam = url?.searchParams.get('take') ?? undefined;
    const skipParam = url?.searchParams.get('skip') ?? undefined;

    const { take, skip } = paginationSchema.parse({ take: takeParam, skip: skipParam });

    const classroomId = url?.searchParams.get('classroomId');
    const availableForClassroom = url?.searchParams.get('availableForClassroom');

    const whereClause: { authorId: string; id?: { in?: string[]; notIn?: string[] } } = { authorId: user.id };

    if (classroomId && !availableForClassroom) {
      const assignmentIds = await prisma.assignmentClassroom.findMany({
        where: { classroomId },
        select: { assignmentId: true },
      });
      whereClause.id = {
        in: assignmentIds.map((ac) => ac.assignmentId),
      };
    }

    if (classroomId && availableForClassroom === 'true') {
      const assignmentIds = await prisma.assignmentClassroom.findMany({
        where: { classroomId },
        select: { assignmentId: true },
      });
      const addedAssignmentIds = assignmentIds.map((ac) => ac.assignmentId);
      if (addedAssignmentIds.length > 0) {
        whereClause.id = {
          notIn: addedAssignmentIds,
        };
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
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
  })()
}

// Tạo bài tập mới (essay hoặc quiz) - TỐI ƯU với user cache
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // ✅ SỬ DỤNG CACHE CHO USER LOOKUP
    const me = await getCachedUser(
      session.user.id || undefined, 
      session.user.email || undefined
    )

    if (!me || me.role !== UserRole.TEACHER) {
      return NextResponse.json({ success: false, message: 'Forbidden - Teacher only' }, { status: 403 })
    }

    const bodyRaw = await req.json()
    console.log('[ASSIGNMENTS POST] Raw request body:', JSON.stringify(bodyRaw, null, 2))
    
    const parsed = createAssignmentSchema.safeParse(bodyRaw)
    if (!parsed.success) {
      console.error('[ASSIGNMENTS POST] Schema validation failed:', parsed.error.flatten())
      console.error('[ASSIGNMENTS POST] Raw body that failed:', bodyRaw)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        errors: parsed.error.flatten(),
        receivedData: bodyRaw 
      }, { status: 400 })
    }

    const { title, description, dueDate, type, questions, openAt, lockAt, timeLimitMinutes } = parsed.data

    const normalizedType = type.toUpperCase() as AssignmentType

    const data: any = {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      openAt: openAt ? new Date(openAt) : null,
      lockAt: lockAt ? new Date(lockAt) : null,
      timeLimitMinutes: typeof timeLimitMinutes === 'number' ? timeLimitMinutes : null,
      type: normalizedType,
      author: { connect: { id: me.id } },
    }

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
          const opts = q.options || []
          if (opts.length < 2) {
            throw new Error(`Question ${idx + 1} must have at least 2 options`)
          }
          const numCorrect = opts.filter(o => !!o.isCorrect).length
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
              create: opts.map((opt, j) => ({
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
      // Cast để tương thích khi chưa chạy prisma generate sau migration
      data: data as any,
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

