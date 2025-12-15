import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';

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
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, 'Unauthorized');
    }
    if (authUser.role !== 'TEACHER') {
      return errorResponse(403, 'Forbidden - Only teachers can access this endpoint');
    }

    const userId = authUser.id;

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

    const classroomIds = classrooms.map((c) => c.id);
    const baseline = classrooms.map((classroom: TeacherPerformanceClassroomRow) => ({
      classroomId: classroom.id,
      classroomName: classroom.name,
      icon: classroom.icon,
      averageGrade: 0,
      totalStudents: classroom._count.students,
      submittedCount: 0,
      color: getColorForIcon(classroom.icon),
    }));

    if (classroomIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Tối ưu: gom query thay vì N+1 theo từng classroom
    const assignmentClassrooms = await prisma.assignmentClassroom.findMany({
      where: { classroomId: { in: classroomIds } },
      select: { classroomId: true, assignmentId: true },
    });

    const assignmentIdToClassroomIds = new Map<string, string[]>();
    for (const row of assignmentClassrooms) {
      const list = assignmentIdToClassroomIds.get(row.assignmentId) ?? [];
      list.push(row.classroomId);
      assignmentIdToClassroomIds.set(row.assignmentId, list);
    }

    const assignmentIds = Array.from(assignmentIdToClassroomIds.keys());
    if (assignmentIds.length === 0) {
      return NextResponse.json({ success: true, data: baseline });
    }

    const statsByClassroom = new Map<
      string,
      { gradeSum: number; gradeCount: number; studentIds: Set<string> }
    >();
    for (const id of classroomIds) {
      statsByClassroom.set(id, { gradeSum: 0, gradeCount: 0, studentIds: new Set() });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        grade: { not: null },
      },
      select: { assignmentId: true, grade: true, studentId: true },
    });

    for (const sub of submissions) {
      const grade = sub.grade;
      if (grade === null) continue;
      const mappedClassrooms = assignmentIdToClassroomIds.get(sub.assignmentId) ?? [];
      for (const classroomId of mappedClassrooms) {
        const st = statsByClassroom.get(classroomId);
        if (!st) continue;
        st.gradeSum += grade;
        st.gradeCount += 1;
        st.studentIds.add(sub.studentId);
      }
    }

    const performanceData = baseline.map((row) => {
      const st = statsByClassroom.get(row.classroomId);
      if (!st || st.gradeCount === 0) return row;
      const averageGrade = st.gradeSum / st.gradeCount;
      return {
        ...row,
        averageGrade: Math.round(averageGrade),
        submittedCount: st.studentIds.size,
      };
    });

    // Sắp xếp theo điểm trung bình giảm dần
    performanceData.sort((a, b) => b.averageGrade - a.averageGrade);

    return NextResponse.json({
      success: true,
      data: performanceData,
    });

  } catch (error) {
    console.error('[ERROR] [GET] /api/teachers/dashboard/performance', error);
    return errorResponse(500, 'Internal server error');
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
