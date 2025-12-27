import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAssignmentSchema, paginationSchema, type CreateAssignmentInput } from '@/types/api'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'
import { withPerformanceTracking } from '@/lib/performance-monitor'

type AssignmentType = 'ESSAY' | 'QUIZ';
type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK' | 'ESSAY';

const ALLOWED_QUESTION_TYPES = [
  'SINGLE',
  'MULTIPLE',
  'TRUE_FALSE',
  'FILL_BLANK',
  'ESSAY',
] as const;

// Lấy danh sách bài tập theo giáo viên hiện tại - TỐI ƯU SELECT + pagination + user cache + performance tracking
export async function GET(req: NextRequest) {
  return withPerformanceTracking('/api/assignments', 'GET', async () => {
    const user = await getAuthenticatedUser(req)
    if (!user) return errorResponse(401, 'Unauthorized')
    if (user.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required')

    let url: URL
    try {
      url = new URL(req.url)
    } catch {
      return errorResponse(400, 'Invalid URL')
    }

    const takeParam = url.searchParams.get('take') ?? undefined;
    const skipParam = url.searchParams.get('skip') ?? undefined;

    let take: number
    let skip: number
    try {
      const parsed = paginationSchema.parse({ take: takeParam, skip: skipParam })
      take = parsed.take
      skip = parsed.skip
    } catch (e) {
      return errorResponse(400, 'Dữ liệu không hợp lệ')
    }

    const classroomId = url.searchParams.get('classroomId');
    const availableForClassroom = url.searchParams.get('availableForClassroom');

    if (classroomId) {
      const classroom = await prisma.classroom.findFirst({
        where: { id: classroomId, teacherId: user.id },
        select: { id: true },
      })
      if (!classroom) {
        return errorResponse(403, 'Forbidden - Classroom access denied')
      }
    }

    const whereClause: { authorId: string; id?: { in?: string[]; notIn?: string[] } } = { authorId: user.id };

    interface AssignmentClassroomIdRow {
      assignmentId: string;
    }

    if (classroomId && !availableForClassroom) {
      const assignmentIds = await prisma.assignmentClassroom.findMany({
        where: { classroomId },
        select: { assignmentId: true },
      });
      whereClause.id = {
        in: assignmentIds.map(
          (ac: AssignmentClassroomIdRow) => ac.assignmentId,
        ),
      };
    }

    if (classroomId && availableForClassroom === 'true') {
      const assignmentIds = await prisma.assignmentClassroom.findMany({
        where: { classroomId },
        select: { assignmentId: true },
      });
      const addedAssignmentIds = assignmentIds.map(
        (ac: AssignmentClassroomIdRow) => ac.assignmentId,
      );
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
        openAt: true,
        lockAt: true,
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
    const me = await getAuthenticatedUser(req)
    if (!me) return errorResponse(401, 'Unauthorized')
    if (me.role !== 'TEACHER') return errorResponse(403, 'Forbidden - Teacher role required')

    const bodyRaw: unknown = await req.json().catch(() => null)
    const parsed = createAssignmentSchema.safeParse(bodyRaw)
    if (!parsed.success) {
      return errorResponse(400, 'Invalid payload', {
        details: parsed.error.flatten(),
        errors: parsed.error.flatten(),
      })
    }

    const { title, description, dueDate, type, questions, openAt, lockAt, timeLimitMinutes } = parsed.data as CreateAssignmentInput

    const normalizedTypeStr = type.trim().toUpperCase()
    if (normalizedTypeStr !== 'ESSAY' && normalizedTypeStr !== 'QUIZ') {
      return errorResponse(400, 'Invalid assignment type')
    }
    const normalizedType: AssignmentType = normalizedTypeStr

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

    if (normalizedType === 'QUIZ') {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return errorResponse(400, 'Quiz requires at least 1 question')
      }

      const questionCreates: Array<{
        content: string
        type: QuestionType
        order: number
        options: { create: Array<{ label: string; content: string; isCorrect: boolean; order: number }> }
      }> = []

      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx]
        const qTypeStr = (q.type || 'SINGLE').toUpperCase()
        if (!ALLOWED_QUESTION_TYPES.includes(qTypeStr as (typeof ALLOWED_QUESTION_TYPES)[number])) {
          return errorResponse(400, `Invalid question type at index ${idx}`)
        }

        const qType = qTypeStr as QuestionType

        const opts = q.options || []
        if (opts.length < 2) {
          return errorResponse(400, `Question ${idx + 1} must have at least 2 options`)
        }

        const numCorrect = opts.filter((o) => !!o.isCorrect).length
        if (qType === 'SINGLE' && numCorrect !== 1) {
          return errorResponse(400, `Question ${idx + 1} (SINGLE) must have exactly 1 correct option`)
        }
        if (qType === 'MULTIPLE' && numCorrect < 1) {
          return errorResponse(400, `Question ${idx + 1} (MULTIPLE) must have at least 1 correct option`)
        }

        questionCreates.push({
          content: q.content,
          type: qType,
          order: typeof q.order === 'number' ? q.order : idx + 1,
          options: {
            create: opts.map((opt, j) => ({
              label: opt.label || String.fromCharCode(65 + j),
              content: opt.content,
              isCorrect: !!opt.isCorrect,
              order: j + 1,
            })),
          },
        })
      }

      data.questions = { create: questionCreates }
    }

    const created = await prisma.assignment.create({
      data,
      include: { questions: { include: { options: true } } },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    console.error('[ASSIGNMENTS POST] Error:', error)
    return errorResponse(500, 'Internal server error')
  }
}

