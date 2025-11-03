import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { User, UserRole } from "@prisma/client";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Request-scoped cache để tránh query user nhiều lần trong cùng một request
 * Sử dụng WeakMap để tự động cleanup khi request kết thúc
 */
const userCache = new WeakMap<NextRequest, User | null>();

/**
 * Lấy authenticated user từ session với request-scoped caching
 * Giảm thiểu database queries bằng cách cache user trong cùng một request
 * 
 * @param req - NextRequest object để dùng làm cache key
 * @param requiredRole - Role yêu cầu (optional, nếu không có thì chỉ check authenticated)
 * @returns User object hoặc null nếu không authenticated/authorized
 * 
 * @example
 * const user = await getAuthenticatedUser(req, UserRole.STUDENT);
 * if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function getAuthenticatedUser(
  req: NextRequest,
  requiredRole?: UserRole
): Promise<User | null> {
  // Kiểm tra cache trước
  if (userCache.has(req)) {
    const cachedUser = userCache.get(req)!;
    if (!requiredRole || cachedUser?.role === requiredRole) {
      return cachedUser;
    }
    return null; // Role mismatch
  }

  try {
    // Lấy session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      userCache.set(req, null);
      return null;
    }

    // Query user từ database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        password: true, // Cần thiết cho một số checks
        createdAt: true,
        updatedAt: true,
      },
    });

    // Kiểm tra role nếu có yêu cầu
    if (user && requiredRole && user.role !== requiredRole) {
      userCache.set(req, null);
      return null;
    }

    // Cache user cho request này
    userCache.set(req, user);

    return user;
  } catch (error) {
    console.error("[ERROR] [getAuthenticatedUser] Error:", error);
    userCache.set(req, null);
    return null;
  }
}

/**
 * Tạo requestId cho logging theo request.
 */
export function getRequestId(req?: NextRequest): string {
  try {
    const headerId = req?.headers.get("x-request-id");
    return headerId || crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/**
 * Tạo phản hồi lỗi chuẩn hóa.
 */
export function errorResponse(
  status: number,
  message: string,
  meta?: Record<string, unknown>
) {
  return NextResponse.json(
    { success: false, message, ...(meta || {}) },
    { status }
  );
}

/**
 * Wrapper thêm logging quanh handler.
 */
export function withApiLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  action: string
): T {
  return (async (...args: any[]) => {
    const req: NextRequest | undefined = args[0];
    const requestId = getRequestId(req);
    const start = Date.now();
    try {
      const res = await handler(...args);
      const ms = Date.now() - start;
      console.log(`[INFO] ${action} OK {requestId:${requestId}, ms:${ms}}`);
      return res;
    } catch (err) {
      const ms = Date.now() - start;
      console.error(`[ERROR] ${action} FAIL {requestId:${requestId}, ms:${ms}}`, err);
      throw err;
    }
  }) as T;
}

/**
 * Helper function để check user có trong classroom không
 * Optimize: Sử dụng direct query thay vì nested includes
 * 
 * @param userId - User ID
 * @param classroomId - Classroom ID
 * @returns boolean
 */
export async function isStudentInClassroom(
  userId: string,
  classroomId: string
): Promise<boolean> {
  const membership = await prisma.classroomStudent.findFirst({
    where: {
      studentId: userId,
      classroomId,
    },
    select: { id: true }, // Chỉ cần check existence
  });

  return !!membership;
}

/**
 * Helper function để check teacher có sở hữu classroom không
 * 
 * @param teacherId - Teacher ID
 * @param classroomId - Classroom ID
 * @returns boolean
 */
export async function isTeacherOfClassroom(
  teacherId: string,
  classroomId: string
): Promise<boolean> {
  const classroom = await prisma.classroom.findFirst({
    where: {
      id: classroomId,
      teacherId,
    },
    select: { id: true }, // Chỉ cần check existence
  });

  return !!classroom;
}

/**
 * Helper function để check student có trong classroom nào có assignment này không
 * Optimize: Single query thay vì nested includes
 * 
 * @param studentId - Student ID
 * @param assignmentId - Assignment ID
 * @returns Classroom ID hoặc null
 */
export async function getStudentClassroomForAssignment(
  studentId: string,
  assignmentId: string
): Promise<string | null> {
  // Query trực tiếp với join
  const assignmentClassroom = await prisma.assignmentClassroom.findFirst({
    where: {
      assignmentId,
      classroom: {
        students: {
          some: {
            studentId,
          },
        },
      },
    },
    select: {
      classroomId: true,
    },
  });

  return assignmentClassroom?.classroomId || null;
}

/**
 * Helper function để check teacher có sở hữu assignment không
 * 
 * @param teacherId - Teacher ID
 * @param assignmentId - Assignment ID
 * @returns boolean
 */
export async function isTeacherOfAssignment(
  teacherId: string,
  assignmentId: string
): Promise<boolean> {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      authorId: teacherId,
    },
    select: { id: true },
  });

  return !!assignment;
}

/**
 * Helper function để check student có trong classroom nào có question này không
 * Optimize: Single query thay vì nested includes
 * 
 * @param studentId - Student ID
 * @param questionId - Question ID
 * @returns Assignment ID hoặc null
 */
export async function getStudentAssignmentForQuestion(
  studentId: string,
  questionId: string
): Promise<string | null> {
  const question = await prisma.question.findFirst({
    where: { id: questionId },
    select: {
      assignmentId: true,
      assignment: {
        select: {
          id: true,
          classrooms: {
            select: {
              classroomId: true,
              classroom: {
                select: {
                  students: {
                    where: { studentId },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!question) return null;

  // Kiểm tra student có trong classroom nào có assignment này không
  const hasAccess = question.assignment.classrooms.some(
    (ac) => ac.classroom.students.length > 0
  );

  return hasAccess ? question.assignmentId : null;
}

