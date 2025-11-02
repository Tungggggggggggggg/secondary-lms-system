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

    // OPTIMIZE: Parallel queries - Lấy classrooms và assignments cùng lúc
    const [studentClassrooms, allAssignments] = await Promise.all([
      // Lấy danh sách classrooms mà student đã tham gia
      prisma.classroomStudent.findMany({
        where: { studentId: user.id },
        select: { classroomId: true },
      }),
      // Lấy tất cả assignments từ classrooms mà student tham gia (direct join)
      prisma.assignmentClassroom.findMany({
        where: {
          classroom: {
            students: {
              some: { studentId: user.id },
            },
          },
        },
        select: {
          addedAt: true,
          assignment: {
            select: {
              id: true,
              title: true,
              description: true,
              dueDate: true,
              type: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  submissions: true,
                  questions: true,
                },
              },
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
      }),
    ]);

    const classroomIds = studentClassrooms.map((sc) => sc.classroomId);

    if (classroomIds.length === 0 || allAssignments.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    // Lấy submissions của student cho các assignments này (parallel với query trên)
    const assignmentIds = allAssignments.map((ac) => ac.assignment.id);
    const studentSubmissions = await prisma.assignmentSubmission.findMany({
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
    });

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
        type: assignment.type,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        _count: assignment._count,
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
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/students/assignments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
