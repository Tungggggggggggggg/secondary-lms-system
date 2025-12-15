import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils'

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
    const authUser = await getAuthenticatedUser(req)
    if (!authUser) {
      return errorResponse(401, 'Unauthorized')
    }

    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Teacher only')
    }

    // Lấy danh sách lớp học của teacher với số lượng học sinh
    const classrooms = (await prisma.classroom.findMany({
      where: {
        teacherId: authUser.id,
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
      createdAt: cls.createdAt
    }));

    return NextResponse.json({ 
      success: true, 
      data: transformedClassrooms 
    }, { status: 200 });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/classrooms', error)
    return errorResponse(500, 'Internal server error')
  }
}