import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

const bodySchema = z.object({
  studentId: z.string().min(1),
  attemptNumber: z.coerce.number().int().min(1).max(999).optional().nullable(),
  action: z.enum(["EXTEND_TIME", "PAUSE", "RESUME", "TERMINATE"]),
  minutes: z.coerce.number().int().min(1).max(1440).optional(),
  reason: z.string().max(500).optional().nullable(),
});

/**
 * POST /api/teachers/assignments/[id]/attempts/override
 * Giáo viên can thiệp phiên làm bài của một học sinh: gia hạn, tạm dừng, tiếp tục, chấm dứt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacher = await getAuthenticatedUser(req);
    if (!teacher) return errorResponse(401, "Unauthorized");
    if (teacher.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;
    if (!assignmentId) {
      return errorResponse(400, "Missing assignmentId");
    }

    const isOwner = await isTeacherOfAssignment(teacher.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your assignment");
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { studentId, attemptNumber, action, minutes, reason } = parsedBody.data;

    // Tìm attempt hiện tại của học sinh
    const attemptWhere: Prisma.AssignmentAttemptWhereInput = {
      assignmentId,
      studentId,
      ...(typeof attemptNumber === "number" ? { attemptNumber } : {}),
    };

    const targetAttempt = await prisma.assignmentAttempt.findFirst({
      where: attemptWhere,
      orderBy: { startedAt: "desc" },
    });

    if (!targetAttempt) {
      return errorResponse(404, "Không tìm thấy lần làm bài phù hợp cho học sinh này");
    }

    const now = new Date();
    const updateData: Prisma.AssignmentAttemptUpdateInput = {};

    switch (action) {
      case "EXTEND_TIME": {
        const m = typeof minutes === "number" ? minutes : 0;
        if (m <= 0) {
          return errorResponse(400, "Số phút gia hạn phải > 0");
        }
        const currentLimit = targetAttempt.timeLimitMinutes ?? 0;
        updateData.timeLimitMinutes = currentLimit + m;
        break;
      }
      case "PAUSE": {
        updateData.status = "PAUSED_BY_TEACHER";
        if (!targetAttempt.endedAt) {
          updateData.endedAt = now;
        }
        break;
      }
      case "RESUME": {
        updateData.status = "IN_PROGRESS";
        // Không chỉnh endedAt ở đây
        break;
      }
      case "TERMINATE": {
        updateData.status = "TERMINATED_TEACHER";
        updateData.endedAt = now;
        break;
      }
      default: {
        return errorResponse(400, "Unsupported action");
      }
    }

    const updatedAttempt = await prisma.assignmentAttempt.update({
      where: { id: targetAttempt.id },
      data: updateData,
    });

    // Ghi log vào exam_events để trang giám sát & phân tích nhìn thấy
    const eventTypeMap: Record<string, string> = {
      EXTEND_TIME: "TEACHER_EXTEND_TIME",
      PAUSE: "TEACHER_PAUSE_SESSION",
      RESUME: "TEACHER_RESUME_SESSION",
      TERMINATE: "TEACHER_TERMINATE_SESSION",
    };

    const eventType = eventTypeMap[action];

    try {
      await prisma.examEvent.create({
        data: {
          assignmentId,
          studentId,
          attempt: updatedAttempt.attemptNumber,
          eventType: eventType.slice(0, 32),
          metadata: {
            teacherId: teacher.id,
            action,
            minutes: minutes ?? null,
            reason: reason ?? null,
            attemptId: updatedAttempt.id,
            attemptNumber: updatedAttempt.attemptNumber,
            at: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      console.error("[TEACHER_OVERRIDE] Failed to create examEvent", e);
    }

    return NextResponse.json(
      { success: true, data: { attempt: updatedAttempt } },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [POST] /api/teachers/assignments/[id]/attempts/override - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
