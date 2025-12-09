import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getCachedUser } from '@/lib/user-cache'

// GET /api/teachers/classrooms/query
// Aggregator: pagination + filters + sorting for teacher classrooms
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const user = await getCachedUser(
      session.user.id || undefined,
      session.user.email || undefined
    )

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ success: false, message: 'Forbidden - Teacher only' }, { status: 403 })
    }

    const url = new URL(req.url || '', 'http://localhost')
    const q = (url.searchParams.get('q') || '').trim()
    const status = url.searchParams.get('status') as 'all' | 'active' | 'archived' | null
    const take = Math.max(1, Math.min(100, Number(url.searchParams.get('take') || 12)))
    const skip = Math.max(0, Number(url.searchParams.get('skip') || 0))
    const sortKey = (url.searchParams.get('sortKey') || 'createdAt') as 'createdAt' | 'name' | 'students'
    const sortDir = (url.searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'

    const whereBase: any = { teacherId: user.id }
    if (q) {
      whereBase.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }

    const where: any = { ...whereBase }
    if (status && status !== 'all') {
      where.isActive = status === 'active'
    }

    const orderBy: any =
      sortKey === 'students' ? { students: { _count: sortDir } } : { [sortKey]: sortDir }

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

    return NextResponse.json({ success: true, data: { items, total, counts: { all: countAll, active: countActive, archived: countArchived } } }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/teachers/classrooms/query] error', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
