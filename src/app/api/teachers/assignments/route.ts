import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET /api/teachers/assignments
// Aggregator: pagination + filters + sorting for teacher assignments
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const teacherId = session.user.id as string;

    const url = new URL(req.url!, 'http://localhost');
    const q = (url.searchParams.get('q') || '').trim();
    const status = url.searchParams.get('status') as 'all' | 'active' | 'completed' | 'draft' | 'needGrading' | null;
    const classId = url.searchParams.get('classId') || undefined;
    const take = Math.max(1, Math.min(100, Number(url.searchParams.get('take') || 10)));
    const skip = Math.max(0, Number(url.searchParams.get('skip') || 0));
    const sortKey = (url.searchParams.get('sortKey') || 'createdAt') as 'createdAt' | 'dueDate' | 'lockAt' | 'title';
    const sortDir = (url.searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

    // Compute base where (search + author)
    const whereBase: any = { authorId: teacherId };
    if (q) {
      whereBase.title = { contains: q, mode: 'insensitive' };
    }

    // Class filter via intermediary table
    if (classId && classId !== 'all') {
      const rows = await prisma.assignmentClassroom.findMany({
        where: { classroomId: classId },
        select: { assignmentId: true },
      });
      const ids = rows.map((r) => r.assignmentId);
      whereBase.id = { in: ids.length > 0 ? ids : ['__none__'] }; // no results when empty
    }

    // Build where for items based on status (effective date: lockAt for QUIZ else dueDate)
    const now = new Date();
    const where = { ...whereBase } as any;
    if (status && status !== 'all') {
      if (status === 'active') {
        where.OR = [
          { AND: [{ lockAt: { gte: now } }] },
          { AND: [{ lockAt: null }, { dueDate: { gte: now } }] },
          { AND: [{ lockAt: null }, { dueDate: null }] },
        ];
      } else if (status === 'completed') {
        where.OR = [
          { AND: [{ lockAt: { lt: now } }] },
          { AND: [{ lockAt: null }, { dueDate: { lt: now } }] },
        ];
      } else if (status === 'needGrading') {
        where.submissions = { some: { grade: null } };
      } else if (status === 'draft') {
        // Hiện chưa có trạng thái draft rõ ràng -> không trả về gì
        where.id = { in: ['__none__'] };
      }
    }

    // Sorting
    const orderBy: any = { [sortKey]: sortDir };

    // Compute counts for quick chips under current search/class filters
    const whereActive: any = {
      ...whereBase,
      OR: [
        { AND: [{ lockAt: { gte: now } }] },
        { AND: [{ lockAt: null }, { dueDate: { gte: now } }] },
        { AND: [{ lockAt: null }, { dueDate: null }] },
      ],
    };
    const whereCompleted: any = {
      ...whereBase,
      OR: [
        { AND: [{ lockAt: { lt: now } }] },
        { AND: [{ lockAt: null }, { dueDate: { lt: now } }] },
      ],
    };
    const whereNeedGrading: any = { ...whereBase, submissions: { some: { grade: null } } };

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

    return NextResponse.json({ success: true, data: { items, total, counts: { all: countAll, active: countActive, completed: countCompleted, needGrading: countNeedGrading } } }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/teachers/assignments] error', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
