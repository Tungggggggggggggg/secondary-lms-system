import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

const querySchema = z.object({
  q: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'completed', 'draft', 'needGrading']).optional().default('all'),
  classId: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      if (!t || t === 'all') return undefined;
      return t;
    }),
  take: z.coerce.number().int().min(1).max(100).optional().default(10),
  skip: z.coerce.number().int().min(0).optional().default(0),
  sortKey: z.enum(['createdAt', 'dueDate', 'lockAt', 'title']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET /api/teachers/assignments
// Aggregator: pagination + filters + sorting for teacher assignments
/**
 * GET /api/teachers/assignments
 * 
 * @param req - NextRequest
 * @returns Danh sách assignments của teacher (phân trang + filter + sort)
 * @sideEffects Query database
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, 'Unauthorized');
    }
    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Only teachers can access this endpoint');
    }

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }

    const teacherId = authUser.id;
    const q = parsed.data.q.trim();
    const status = parsed.data.status;
    const classId = parsed.data.classId;
    const take = parsed.data.take;
    const skip = parsed.data.skip;
    const sortKey = parsed.data.sortKey;
    const sortDir = parsed.data.sortDir;

    // Compute base where (search + author)
    const whereBase: any = { authorId: teacherId };
    if (q) {
      whereBase.title = { contains: q, mode: 'insensitive' };
    }

    // Class filter via intermediary table
    if (classId) {
      const rows = await prisma.assignmentClassroom.findMany({
        where: { classroomId: classId, classroom: { teacherId } },
        select: { assignmentId: true },
      });
      const ids = rows.map((r: { assignmentId: string }) => r.assignmentId);
      whereBase.id = { in: ids.length > 0 ? ids : ['__none__'] }; // no results when empty
    }

    // Build where for items based on status (effective date: lockAt for QUIZ else dueDate)
    const now = new Date();
    let where: any = { ...whereBase };
    if (status !== 'all') {
      if (status === 'active') {
        where = {
          ...whereBase,
          OR: [
            { lockAt: { gte: now } },
            { AND: [{ lockAt: null }, { dueDate: { gte: now } }] },
            { AND: [{ lockAt: null }, { dueDate: null }] },
          ],
        };
      } else if (status === 'completed') {
        where = {
          ...whereBase,
          OR: [
            { lockAt: { lt: now } },
            { AND: [{ lockAt: null }, { dueDate: { lt: now } }] },
          ],
        };
      } else if (status === 'needGrading') {
        where = { ...whereBase, submissions: { some: { grade: null } } };
      } else if (status === 'draft') {
        // Hiện chưa có trạng thái draft rõ ràng -> không trả về gì
        where = { ...whereBase, id: { in: ['__none__'] } };
      }
    }

    // Sorting
    const orderBy: any =
      sortKey === 'createdAt'
        ? { createdAt: sortDir }
        : sortKey === 'dueDate'
        ? { dueDate: sortDir }
        : sortKey === 'lockAt'
        ? { lockAt: sortDir }
        : { title: sortDir };

    // Compute counts for quick chips under current search/class filters
    const whereActive: any = {
      ...whereBase,
      OR: [
        { lockAt: { gte: now } },
        { AND: [{ lockAt: null }, { dueDate: { gte: now } }] },
        { AND: [{ lockAt: null }, { dueDate: null }] },
      ],
    };
    const whereCompleted: any = {
      ...whereBase,
      OR: [
        { lockAt: { lt: now } },
        { AND: [{ lockAt: null }, { dueDate: { lt: now } }] },
      ],
    };
    const whereNeedGrading: any = {
      ...whereBase,
      submissions: { some: { grade: null } },
    };

    const [items, total, countAll, countActive, countCompleted, countNeedGrading] = await Promise.all([
      prisma.assignment.findMany({
        where,
        orderBy,
        take,
        skip,
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          openAt: true,
          lockAt: true,
          timeLimitMinutes: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { submissions: true, questions: true } },
        },
      }),
      prisma.assignment.count({ where }),
      prisma.assignment.count({ where: whereBase }),
      prisma.assignment.count({ where: whereActive }),
      prisma.assignment.count({ where: whereCompleted }),
      prisma.assignment.count({ where: whereNeedGrading }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          total,
          counts: {
            all: countAll,
            active: countActive,
            completed: countCompleted,
            needGrading: countNeedGrading,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/assignments', error);
    return errorResponse(500, 'Internal server error');
  }
}
