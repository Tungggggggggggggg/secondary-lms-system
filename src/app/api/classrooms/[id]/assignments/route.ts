import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfClassroom, isTeacherOfAssignment } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

const postSchema = z
  .object({
    assignmentId: z.string().min(1),
  })
  .strict();

interface AssignmentClassroomRow {
  addedAt: Date;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    openAt: Date | null;
    lockAt: Date | null;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    _count: {
      submissions: number;
      questions: number;
    };
  };
}

interface FileCountRow {
  assignmentId: string;
  _count: {
    assignmentId: number;
  };
}

/**
 * GET /api/classrooms/[id]/assignments
 * Lấy danh sách bài tập đã được thêm vào lớp học
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const classroomId = params.id;

    // Optimize: Kiểm tra teacher có sở hữu classroom không (single query)
    const isOwner = await isTeacherOfClassroom(user.id, classroomId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your classroom");
    }

    // Optimize: Sử dụng select thay vì include để chỉ lấy fields cần thiết
    const assignmentClassrooms = (await prisma.assignmentClassroom.findMany({
      where: { classroomId },
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
      },
      orderBy: { addedAt: "desc" },
    })) as AssignmentClassroomRow[];

    // Also count file-based submissions
    const assignmentIds = assignmentClassrooms.map(
      (ac: AssignmentClassroomRow) => ac.assignment.id,
    );

    let fileCounts: FileCountRow[] = [];
    if (assignmentIds.length) {
      const raw = await prisma.submission.groupBy({
        by: ["assignmentId"],
        where: { assignmentId: { in: assignmentIds } },
        _count: { assignmentId: true },
      });
      fileCounts = raw as unknown as FileCountRow[];
    }
    const fileCountMap = new Map<string, number>(
      fileCounts.map((c: FileCountRow) => [c.assignmentId, c._count.assignmentId]),
    );

    // Transform data để trả về
    const assignments = assignmentClassrooms.map(
      (ac: AssignmentClassroomRow) => {
        const base = ac.assignment;
        const fileCount = fileCountMap.get(base.id) || 0;
        return {
          ...base,
          addedAt: ac.addedAt.toISOString(),
          _count: {
            ...base._count,
            submissions: (base._count?.submissions || 0) + fileCount,
          },
          fileSubmissions: fileCount,
        };
      },
    );

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

/**
 * POST /api/classrooms/[id]/assignments
 * Thêm bài tập vào lớp học
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const classroomId = params.id;
    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { assignmentId } = parsedBody.data;

    // Optimize: Parallel queries - Kiểm tra classroom ownership + assignment ownership
    const [isClassroomOwner, isAssignmentOwner] = await Promise.all([
      isTeacherOfClassroom(user.id, classroomId),
      isTeacherOfAssignment(user.id, assignmentId),
    ]);

    if (!isClassroomOwner) {
      return errorResponse(403, "Forbidden - Not your classroom");
    }

    if (!isAssignmentOwner) {
      return errorResponse(403, "Forbidden - Assignment does not belong to you");
    }

    // Kiểm tra assignment đã được thêm vào classroom chưa
    const existing = await prisma.assignmentClassroom.findUnique({
      where: {
        classroomId_assignmentId: {
          classroomId,
          assignmentId,
        },
      },
    });

    if (existing) {
      return errorResponse(409, "Assignment already added to this classroom");
    }

    // Thêm assignment vào classroom
    const assignmentClassroom = await prisma.assignmentClassroom.create({
      data: {
        classroomId,
        assignmentId,
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
      },
    });

    try {
      const students = await prisma.classroomStudent.findMany({
        where: { classroomId },
        select: { studentId: true },
      });

      const title = `Bài tập mới: ${assignmentClassroom.assignment.title}`;
      const actionUrl = `/dashboard/student/assignments/${assignmentId}`;
      await Promise.allSettled(
        students.map((s: { studentId: string }) =>
          notificationRepo.add(s.studentId, {
            type: "STUDENT_ASSIGNMENT_ASSIGNED",
            title,
            description: "Giáo viên đã giao một bài tập mới cho lớp của bạn.",
            actionUrl,
            dedupeKey: `assign:${classroomId}:${assignmentId}:${s.studentId}`,
            meta: { classroomId, assignmentId },
          })
        )
      );
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: "Assignment added to classroom successfully",
        data: {
          ...assignmentClassroom.assignment,
          addedAt: assignmentClassroom.addedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}

/**
 * DELETE /api/classrooms/[id]/assignments/[assignmentId]
 * Xóa bài tập khỏi lớp học
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; assignmentId?: string } }
) {
  try {
    // Lấy assignmentId từ query params hoặc từ URL path
    const url = new URL(req.url);
    const assignmentId =
      params.assignmentId || url.searchParams.get("assignmentId");

    if (!assignmentId) {
      return errorResponse(400, "assignmentId is required");
    }

    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const classroomId = params.id;

    // Optimize: Kiểm tra teacher có sở hữu classroom không (single query)
    const isOwner = await isTeacherOfClassroom(user.id, classroomId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your classroom");
    }

    // Kiểm tra assignment có được thêm vào classroom không
    const assignmentClassroom = await prisma.assignmentClassroom.findUnique({
      where: {
        classroomId_assignmentId: {
          classroomId,
          assignmentId,
        },
      },
    });

    if (!assignmentClassroom) {
      return errorResponse(404, "Assignment not found in this classroom");
    }

    // Xóa assignment khỏi classroom
    await prisma.assignmentClassroom.delete({
      where: {
        classroomId_assignmentId: {
          classroomId,
          assignmentId,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Assignment removed from classroom successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [DELETE] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
