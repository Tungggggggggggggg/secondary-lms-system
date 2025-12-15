import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

/**
 * POST /api/students/assignments/[id]/attempts/start
 * Khởi tạo một attempt cho bài QUIZ, snapshot các cấu hình quan trọng và trả về attempt info
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden - Student role required");

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const assignmentId = parsedParams.data.id;

    // Kiểm tra quyền truy cập assignment qua classroom membership
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    // Lấy thông tin assignment cần thiết
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        type: true,
        dueDate: true,
        openAt: true,
        lockAt: true,
        timeLimitMinutes: true,
        max_attempts: true,
        anti_cheat_config: true,
      },
    });

    if (!assignment) {
      return errorResponse(404, "Assignment not found");
    }

    if (assignment.type !== "QUIZ") {
      return errorResponse(400, "Only QUIZ assignments support attempts");
    }

    const now = new Date();

    // Kiểm tra thời gian mở/khóa
    if (assignment.openAt && now < new Date(assignment.openAt)) {
      return errorResponse(403, "Bài chưa mở, không thể bắt đầu");
    }
    const lockedAt = assignment.lockAt ?? assignment.dueDate;
    if (lockedAt && now > new Date(lockedAt)) {
      return errorResponse(403, "Bài đã khóa hoặc quá hạn");
    }

    // Nếu đã có attempt đang IN_PROGRESS -> trả về attempt đó để tiếp tục (tránh tạo trùng)
    const existingInProgress = await prisma.assignmentAttempt.findFirst({
      where: {
        assignmentId,
        studentId: user.id,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (existingInProgress) {
      return NextResponse.json(
        {
          success: true,
          data: {
            attemptId: existingInProgress.id,
            attemptNumber: existingInProgress.attemptNumber,
            shuffleSeed: existingInProgress.shuffleSeed,
            startedAt: existingInProgress.startedAt.toISOString(),
            antiCheatConfig: assignment.anti_cheat_config ?? null,
            timeLimitMinutes: assignment.timeLimitMinutes ?? null,
          },
        },
        { status: 200 }
      );
    }

    // Tính attemptNumber kế tiếp dựa trên cả submissions và attempts
    const [latestSubmission, latestAttemptRow] = await Promise.all([
      prisma.assignmentSubmission.findFirst({
        where: { assignmentId, studentId: user.id },
        orderBy: { attempt: "desc" },
        select: { attempt: true },
      }),
      prisma.assignmentAttempt.findFirst({
        where: { assignmentId, studentId: user.id },
        orderBy: { attemptNumber: "desc" },
        select: { attemptNumber: true },
      }),
    ]);

    const lastSubAttempt = latestSubmission?.attempt ?? 0;
    const lastRowAttempt = latestAttemptRow?.attemptNumber ?? 0;
    const nextAttempt = Math.max(lastSubAttempt, lastRowAttempt) + 1;

    // Kiểm tra giới hạn số lần làm
    if ((assignment.max_attempts ?? 1) < nextAttempt) {
      return errorResponse(
        403,
        `Bạn đã vượt quá số lần làm tối đa (${assignment.max_attempts ?? 1}).`
      );
    }

    // Sinh seed xáo trộn (server-side authoritative)
    const seed = Math.max(1, Math.floor(Date.now() % 2147483647));

    const created = await prisma.assignmentAttempt.create({
      data: {
        assignmentId,
        studentId: user.id,
        attemptNumber: nextAttempt,
        shuffleSeed: seed,
        antiCheatConfig: assignment.anti_cheat_config ?? undefined,
        timeLimitMinutes: assignment.timeLimitMinutes ?? undefined,
        status: "IN_PROGRESS",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          attemptId: created.id,
          attemptNumber: created.attemptNumber,
          shuffleSeed: created.shuffleSeed,
          startedAt: created.startedAt.toISOString(),
          antiCheatConfig: assignment.anti_cheat_config ?? null,
          timeLimitMinutes: assignment.timeLimitMinutes ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[ERROR] [POST] /api/students/assignments/[id]/attempts/start - Error:", error);
    return errorResponse(500, "Internal server error");
  }
}
