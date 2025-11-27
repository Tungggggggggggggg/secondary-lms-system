import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isTeacherOfAssignment } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!me || me.role !== 'TEACHER') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const assignmentId = String(searchParams.get('assignmentId') || '')
    const studentId = searchParams.get('studentId') ? String(searchParams.get('studentId')) : undefined
    const attemptStr = searchParams.get('attempt')
    const attempt = attemptStr != null ? Number(attemptStr) : undefined
    const limitStr = searchParams.get('limit')
    const limit = limitStr != null ? Math.min(500, Math.max(1, Number(limitStr))) : 200
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    if (!assignmentId) {
      return NextResponse.json({ success: false, message: 'Missing assignmentId' }, { status: 400 })
    }

    const allowed = await isTeacherOfAssignment(me.id, assignmentId)
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const where: any = { assignmentId }
    if (studentId) where.studentId = studentId
    if (!Number.isNaN(attempt) && typeof attempt === 'number') where.attempt = attempt
    if (fromStr || toStr) {
      where.createdAt = {}
      if (fromStr) where.createdAt.gte = new Date(fromStr as string)
      if (toStr) where.createdAt.lte = new Date(toStr as string)
    }

    const events = await prisma.examEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        attempt: true,
        eventType: true,
        createdAt: true,
        metadata: true,
        student: { select: { id: true, fullname: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, data: events }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!me || me.role !== 'STUDENT') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
    }

    const assignmentId = String(body.assignmentId || '')
    const eventType = String(body.eventType || '')
    const attempt = typeof body.attempt === 'number' ? body.attempt : null
    const metadata = body.metadata ?? null

    if (!assignmentId || !eventType) {
      return NextResponse.json({ success: false, message: 'Missing assignmentId or eventType' }, { status: 400 })
    }

    await prisma.examEvent.create({
      data: {
        assignmentId,
        studentId: me.id,
        attempt: attempt ?? undefined,
        eventType: eventType.slice(0, 32),
        metadata: metadata as any,
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
