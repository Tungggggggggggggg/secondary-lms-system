import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'

const querySchema = z.object({
  q: z.string().optional().default(''),
  status: z.enum(['all', 'active', 'archived']).optional().default('all'),
  take: z.coerce.number().int().min(1).max(100).optional().default(12),
  skip: z.coerce.number().int().min(0).optional().default(0),
  sortKey: z.enum(['createdAt', 'name', 'students']).optional().default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET /api/teachers/classrooms/query
// Aggregator: pagination + filters + sorting for teacher classrooms
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return errorResponse(401, 'Unauthorized')
    }

    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Teacher only')
    }

    const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      })
    }

    const q = parsed.data.q.trim()
    const status = parsed.data.status
    const take = parsed.data.take
    const skip = parsed.data.skip
    const sortKey = parsed.data.sortKey
    const sortDir = parsed.data.sortDir

    const whereBase: any = { teacherId: authUser.id }
    if (q) {
      whereBase.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const where: any =
      status !== 'all' ? { ...whereBase, isActive: status === 'active' } : { ...whereBase }

    const orderBy: any =
      sortKey === 'students'
        ? { students: { _count: sortDir } }
        : sortKey === 'name'
          ? { name: sortDir }
          : { createdAt: sortDir }

    const [items, total, countAll, countActive, countArchived] = await Promise.all([
      prisma.classroom.findMany({
        where,
        orderBy,
        take,
        skip,
        select: {
          id: true,
          name: true,
          description: true,
          code: true,
          icon: true,
          maxStudents: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          teacherId: true,
          _count: { select: { students: true } },
        },
      }),
      prisma.classroom.count({ where }),
      prisma.classroom.count({ where: whereBase }),
      prisma.classroom.count({ where: { ...whereBase, isActive: true } }),
      prisma.classroom.count({ where: { ...whereBase, isActive: false } }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          items,
          total,
          counts: { all: countAll, active: countActive, archived: countArchived },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/classrooms/query', error)
    return errorResponse(500, 'Internal server error')
  }
}
