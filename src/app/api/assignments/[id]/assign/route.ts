import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

// Schema validation cho request body
const assignAssignmentSchema = z.object({
  classroomIds: z.array(z.string()).min(1, "Phải chọn ít nhất 1 lớp học"),
  customSettings: z.record(z.string(), z.object({
    dueDate: z.string().datetime().optional(),
    openAt: z.string().datetime().optional(),
    lockAt: z.string().datetime().optional(),
  })).optional()
});

const unassignAssignmentSchema = z.object({
  classroomId: z.string().min(1, "Classroom ID là bắt buộc")
});

/**
 * POST /api/assignments/[id]/assign
 * Assign assignment vào một hoặc nhiều lớp học
 */
export async function POST(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    // Lấy thông tin user hiện tại
    const user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Teacher only' 
      }, { status: 403 })
    }

    // Validate assignment ID
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, title: true }
    });

    if (!assignment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assignment not found' 
      }, { status: 404 })
    }

    // Kiểm tra quyền sở hữu assignment
    if (assignment.authorId !== user.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Not your assignment' 
      }, { status: 403 })
    }

    // Parse và validate request body
    const body = await req.json();
    const parsed = assignAssignmentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        errors: parsed.error.flatten() 
      }, { status: 400 })
    }

    const { classroomIds, customSettings } = parsed.data;

    // Kiểm tra các lớp học có tồn tại và thuộc về teacher này không
    const classrooms = await prisma.classroom.findMany({
      where: {
        id: { in: classroomIds },
        teacherId: user.id,
        isActive: true
      },
      select: { id: true, name: true }
    });

    if (classrooms.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Không tìm thấy lớp học nào hợp lệ' 
      }, { status: 404 })
    }

    // Lấy danh sách classroom IDs hợp lệ
    const validClassroomIds = classrooms.map(c => c.id);

    // Tạo các AssignmentClassroom records
    const assignmentClassrooms = await prisma.assignmentClassroom.createMany({
      data: validClassroomIds.map(classroomId => ({
        assignmentId: params.id,
        classroomId: classroomId
      })),
      skipDuplicates: true // Bỏ qua nếu đã tồn tại
    });

    // Lấy thông tin chi tiết sau khi assign để trả về
    const result = await prisma.assignmentClassroom.findMany({
      where: {
        assignmentId: params.id,
        classroomId: { in: validClassroomIds }
      },
      include: {
        classroom: {
          include: {
            _count: {
              select: { students: true }
            }
          }
        }
      }
    });

    const totalStudents = result.reduce((sum, ac) => sum + ac.classroom._count.students, 0);

    return NextResponse.json({
      success: true,
      message: `Đã thêm bài tập "${assignment.title}" vào ${result.length} lớp học`,
      data: {
        assignmentId: params.id,
        assignmentTitle: assignment.title,
        classrooms: result.map(ac => ({
          id: ac.classroom.id,
          name: ac.classroom.name,
          studentCount: ac.classroom._count.students,
          addedAt: ac.addedAt
        })),
        totalStudents,
        totalClassrooms: result.length
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[ASSIGNMENT ASSIGN POST] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/assignments/[id]/assign
 * Gỡ assignment khỏi một lớp học
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 })
    }

    // Lấy thông tin user hiện tại
    const user = session.user.id
      ? await prisma.user.findUnique({ where: { id: session.user.id } })
      : session.user.email
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Teacher only' 
      }, { status: 403 })
    }

    // Validate assignment ID và quyền sở hữu
    const assignment = await prisma.assignment.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, title: true }
    });

    if (!assignment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assignment not found' 
      }, { status: 404 })
    }

    if (assignment.authorId !== user.id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Forbidden - Not your assignment' 
      }, { status: 403 })
    }

    // Parse và validate request body
    const body = await req.json();
    const parsed = unassignAssignmentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        errors: parsed.error.flatten() 
      }, { status: 400 })
    }

    const { classroomId } = parsed.data;

    // Kiểm tra classroom có thuộc về teacher này không
    const classroom = await prisma.classroom.findUnique({
      where: { 
        id: classroomId,
        teacherId: user.id 
      },
      select: { id: true, name: true }
    });

    if (!classroom) {
      return NextResponse.json({ 
        success: false, 
        message: 'Classroom not found or access denied' 
      }, { status: 404 })
    }

    // Xóa AssignmentClassroom record
    const deleted = await prisma.assignmentClassroom.deleteMany({
      where: {
        assignmentId: params.id,
        classroomId: classroomId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Assignment không được gán vào lớp học này' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Đã gỡ bài tập "${assignment.title}" khỏi lớp "${classroom.name}"`,
      data: {
        assignmentId: params.id,
        classroomId: classroomId,
        classroomName: classroom.name
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[ASSIGNMENT ASSIGN DELETE] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
