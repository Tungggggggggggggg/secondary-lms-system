import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { Prisma, UserRole } from '@prisma/client'

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

