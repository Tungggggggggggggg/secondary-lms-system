import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/api-utils";

/**
 * GET /api/students/assignments
 * Lấy danh sách assignments từ tất cả classrooms mà student đã tham gia
 * Bao gồm thông tin submission của student (nếu có)
 * OPTIMIZED: Parallel queries, select thay vì include
 */
export async function GET(req: NextRequest) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, UserRole.STUDENT);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // OPTIMIZE: Lấy classrooms trước, sau đó filter trực tiếp thay vì nested some()
    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      select: { classroomId: true },
    });

    const classroomIds = studentClassrooms.map((sc) => sc.classroomId);

    if (classroomIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    // OPTIMIZE: Query trực tiếp với classroomId IN thay vì nested some() - sử dụng index
    const allAssignments = await prisma.assignmentClassroom.findMany({
      where: {
        classroomId: { in: classroomIds },
      },
      select: {
        addedAt: true,
        assignment: {
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
            // OPTIMIZE: Loại bỏ _count để tránh expensive queries
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            code: true,
            icon: true,
            teacher: {
              select: { id: true, fullname: true, email: true },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    if (allAssignments.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    const assignmentIds = allAssignments.map((ac) => ac.assignment.id);

    // OPTIMIZE: Fetch submissions song song với counts (nếu cần) cho tất cả assignments
    const [studentSubmissions] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: {
          assignmentId: { in: assignmentIds },
          studentId: user.id,
        },
        select: {
          id: true,
          assignmentId: true,
          content: true,
          grade: true,
          feedback: true,
          submittedAt: true,
        },
      }),
      // Counts có thể được fetch riêng nếu cần, nhưng tạm thời bỏ qua để tối ưu
    ]);

    // Tạo map để lookup submission nhanh
    const submissionMap = new Map(
      studentSubmissions.map((sub) => [sub.assignmentId, sub])
    );

    // Transform data để trả về (optimize: sử dụng classroom từ join)
    const assignments = allAssignments.map((ac) => {
      const assignment = ac.assignment;
      const submission = submissionMap.get(assignment.id);
      const classroom = ac.classroom;

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        openAt: assignment.openAt,
        lockAt: assignment.lockAt ?? assignment.dueDate,
        timeLimitMinutes: assignment.timeLimitMinutes,
        type: assignment.type,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        // OPTIMIZE: _count đã được loại bỏ để tăng tốc độ query
        _count: { submissions: 0, questions: 0 }, // Placeholder - có thể fetch riêng nếu cần
        // Thông tin classroom (từ join)
        classroom: {
          id: classroom.id,
          name: classroom.name,
          code: classroom.code,
          icon: classroom.icon,
          teacher: classroom.teacher,
        },
        // Thông tin submission của student
        submission: submission
          ? {
              id: submission.id,
              content: submission.content,
              grade: submission.grade,
              feedback: submission.feedback,
              submittedAt: submission.submittedAt.toISOString(),
            }
          : null,
        // Trạng thái
        status: submission
          ? "submitted"
          : assignment.dueDate && new Date(assignment.dueDate) < new Date()
          ? "overdue"
          : "pending",
      };
    });

    console.log(
      `[INFO] [GET] /api/students/assignments - Found ${assignments.length} assignments for student: ${user.id}`
    );

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments - Error:",
      error
    );
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
