import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

/**
 * GET /api/assignments/[id]/classrooms
 * Lấy danh sách lớp học đang có assignment này
 * Dùng cho hiển thị classroom badges trên AssignmentCard
 */
export async function GET(
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

    // Lấy danh sách classrooms có assignment này
    const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
      where: {
        assignmentId: params.id
      },
      include: {
        classroom: {
          include: {
            _count: {
              select: { 
                students: true
              }
            }
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    // Lấy danh sách classroom IDs
    const classroomIds = assignmentClassrooms.map(ac => ac.classroom.id);

    // Lấy danh sách students trong các classrooms này
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: {
        classroomId: { in: classroomIds }
      },
      select: {
        classroomId: true,
        studentId: true
      }
    });

    // Lấy submissions của assignment này
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: params.id,
        studentId: { in: classroomStudents.map(cs => cs.studentId) }
      },
      select: {
        studentId: true
      }
    });

    // Tạo map: studentId -> hasSubmitted
    const submissionMap = new Set(submissions.map(s => s.studentId));

    // Tạo map: classroomId -> studentIds
    const classroomStudentMap = classroomStudents.reduce((map, cs) => {
      if (!map.has(cs.classroomId)) {
        map.set(cs.classroomId, []);
      }
      map.get(cs.classroomId)!.push(cs.studentId);
      return map;
    }, new Map<string, string[]>());

    // Transform data để phù hợp với frontend
    const transformedData = assignmentClassrooms.map(ac => {
      const classroomId = ac.classroom.id;
      const totalStudents = ac.classroom._count.students;
      const studentIds = classroomStudentMap.get(classroomId) || [];
      
      // Tính số bài nộp thực tế cho classroom này
      const submissionCount = studentIds.filter(studentId => 
        submissionMap.has(studentId)
      ).length;

      return {
        classroomId: ac.classroom.id,
        classroomName: ac.classroom.name,
        classroomCode: ac.classroom.code,
        classroomIcon: ac.classroom.icon,
        studentCount: totalStudents,
        submissionCount: submissionCount,
        assignedAt: ac.addedAt,
        // Màu sắc cố định cho mỗi classroom (dựa trên ID)
        color: `#${ac.classroom.id.slice(0, 6).split('').map(c => c.charCodeAt(0)).join('').slice(0, 6)}`
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: transformedData,
      summary: {
        totalClassrooms: transformedData.length,
        totalStudents: transformedData.reduce((sum, cls) => sum + cls.studentCount, 0),
        totalSubmissions: transformedData.reduce((sum, cls) => sum + cls.submissionCount, 0)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[ASSIGNMENT CLASSROOMS GET] Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
