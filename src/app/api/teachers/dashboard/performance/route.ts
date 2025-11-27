import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

interface TeacherPerformanceClassroomRow {
  id: string;
  name: string;
  icon: string | null;
  _count: {
    students: number;
  };
}

/**
 * API: GET /api/teachers/dashboard/performance
 * Mục đích: Lấy hiệu suất giảng dạy theo từng lớp học
 * - Điểm trung bình của lớp
 * - Tỷ lệ nộp bài
 * - Thông tin lớp học
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[API /api/teachers/dashboard/performance] Bắt đầu xử lý request...');

    // Xác thực người dùng
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error('[API /api/teachers/dashboard/performance] Không có session');
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Kiểm tra role teacher
    if (userRole !== 'TEACHER') {
      console.error('[API /api/teachers/dashboard/performance] User không phải teacher');
      return NextResponse.json(
        { success: false, message: 'Forbidden - Only teachers can access this endpoint' },
        { status: 403 }
      );
    }

    console.log(`[API /api/teachers/dashboard/performance] Teacher ID: ${userId}`);

    // Lấy tất cả các lớp học của teacher
    const classrooms = (await prisma.classroom.findMany({
      where: {
        teacherId: userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // Lấy top 5 lớp mới nhất
    })) as TeacherPerformanceClassroomRow[];

    // Tính toán hiệu suất cho từng lớp
    const performanceData = await Promise.all(
      classrooms.map(async (classroom: TeacherPerformanceClassroomRow) => {
        // Lấy tất cả bài tập của lớp này
        const assignments = await prisma.assignmentClassroom.findMany({
          where: {
            classroomId: classroom.id,
          },
          select: {
            assignmentId: true,
          },
        });

        const assignmentIds = assignments.map(
          (a: { assignmentId: string }) => a.assignmentId,
        );

        if (assignmentIds.length === 0) {
          // Không có bài tập nào
          return {
            classroomId: classroom.id,
            classroomName: classroom.name,
            icon: classroom.icon,
            averageGrade: 0,
            totalStudents: classroom._count.students,
            submittedCount: 0,
            color: getColorForIcon(classroom.icon),
          };
        }

        // Lấy tất cả submissions đã được chấm điểm
        const submissions = await prisma.assignmentSubmission.findMany({
          where: {
            assignmentId: {
              in: assignmentIds,
            },
            grade: {
              not: null,
            },
          },
          select: {
            grade: true,
            studentId: true,
          },
        });

        // Tính điểm trung bình
        const totalGrade = submissions.reduce(
          (sum: number, sub: { grade: number | null }) =>
            sum + (sub.grade || 0),
          0,
        );
        const averageGrade = submissions.length > 0 
          ? Math.round((totalGrade / submissions.length) * 100) / 100
          : 0;

        // Đếm số học sinh đã nộp bài (unique)
        const uniqueStudents = new Set(
          submissions.map((s: { studentId: string }) => s.studentId),
        );
        const submittedCount = uniqueStudents.size;

        return {
          classroomId: classroom.id,
          classroomName: classroom.name,
          icon: classroom.icon,
          averageGrade: Math.round(averageGrade), // Làm tròn thành số nguyên
          totalStudents: classroom._count.students,
          submittedCount,
          color: getColorForIcon(classroom.icon),
        };
      })
    );

    // Sắp xếp theo điểm trung bình giảm dần
    performanceData.sort((a, b) => b.averageGrade - a.averageGrade);

    console.log('[API /api/teachers/dashboard/performance] Hiệu suất:', performanceData);

    return NextResponse.json({
      success: true,
      data: performanceData,
    });

  } catch (error) {
    console.error('[API /api/teachers/dashboard/performance] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function: Lấy màu gradient dựa trên icon
 */
function getColorForIcon(icon: string | null): string {
  if (!icon) return 'from-gray-400 to-gray-500';
  if (icon.includes('📜') || icon.includes('📚')) return 'from-yellow-400 to-yellow-500';
  if (icon.includes('🗺️')) return 'from-emerald-400 to-emerald-500';
  if (icon.includes('🗣️')) return 'from-blue-400 to-blue-500';
  if (icon.includes('🧮')) return 'from-purple-400 to-purple-500';
  if (icon.includes('🔬')) return 'from-green-400 to-green-500';
  if (icon.includes('🎨')) return 'from-pink-400 to-pink-500';
  return 'from-gray-400 to-gray-500';
}
