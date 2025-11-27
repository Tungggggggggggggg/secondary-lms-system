import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isTeacherOfClassroom, isTeacherOfAssignment } from "@/lib/api-utils";

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
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const classroomId = params.id;

    // Optimize: Kiểm tra teacher có sở hữu classroom không (single query)
    const isOwner = await isTeacherOfClassroom(user.id, classroomId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom" },
        { status: 403 }
      );
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

    console.log(
      `[INFO] [GET] /api/classrooms/${classroomId}/assignments - Found ${assignments.length} assignments`
    );

    return NextResponse.json(
      { success: true, data: assignments },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
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
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const classroomId = params.id;
    const body = await req.json();
    const { assignmentId } = body as { assignmentId?: string };

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "assignmentId is required" },
        { status: 400 }
      );
    }

    // Optimize: Parallel queries - Kiểm tra classroom ownership + assignment ownership
    const [isClassroomOwner, isAssignmentOwner] = await Promise.all([
      isTeacherOfClassroom(user.id, classroomId),
      isTeacherOfAssignment(user.id, assignmentId),
    ]);

    if (!isClassroomOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom" },
        { status: 403 }
      );
    }

    if (!isAssignmentOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden - Assignment does not belong to you",
        },
        { status: 403 }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Assignment already added to this classroom",
        },
        { status: 409 }
      );
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

    console.log(
      `[INFO] [POST] /api/classrooms/${classroomId}/assignments - Added assignment ${assignmentId}`
    );

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
  } catch (error) {
    console.error(
      "[ERROR] [POST] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { success: false, message: "assignmentId is required" },
        { status: 400 }
      );
    }

    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const classroomId = params.id;

    // Optimize: Kiểm tra teacher có sở hữu classroom không (single query)
    const isOwner = await isTeacherOfClassroom(user.id, classroomId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your classroom" },
        { status: 403 }
      );
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
      return NextResponse.json(
        {
          success: false,
          message: "Assignment not found in this classroom",
        },
        { status: 404 }
      );
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

    console.log(
      `[INFO] [DELETE] /api/classrooms/${classroomId}/assignments - Removed assignment ${assignmentId}`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Assignment removed from classroom successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[ERROR] [DELETE] /api/classrooms/[id]/assignments - Error:",
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
