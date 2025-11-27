import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { getCachedUser } from '@/lib/user-cache'

interface TeacherClassroomRow {
  id: string
  name: string
  description: string | null
  code: string
  icon: string | null
  maxStudents: number | null
  createdAt: Date
  _count: {
    students: number
  }
}

/**
 * API lấy danh sách lớp học của giáo viên hiện tại
 * Dùng cho modal assign assignment to classroom
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    // ✅ SỬ DỤNG CACHE CHO USER LOOKUP
    const user = await getCachedUser(
      session.user.id || undefined, 
      session.user.email || undefined
    )

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Teacher only' 
      }, { status: 403 })
    }

    // Lấy danh sách lớp học của teacher với số lượng học sinh
    const classrooms = (await prisma.classroom.findMany({
      where: {
        teacherId: user.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        icon: true,
        maxStudents: true,
        createdAt: true,
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })) as TeacherClassroomRow[];

    // Transform data để phù hợp với frontend
    const transformedClassrooms = classrooms.map((cls: TeacherClassroomRow) => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      code: cls.code,
      icon: cls.icon,
      maxStudents: cls.maxStudents,
      studentCount: cls._count.students,
      createdAt: cls.createdAt,
      // Màu sắc ngẫu nhiên cho UI badge (có thể tinh chỉnh sau)
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    }));

    return NextResponse.json({ 
      success: true, 
      data: transformedClassrooms 
    }, { status: 200 });

  } catch (error) {
    console.error('[TEACHERS CLASSROOMS GET] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}