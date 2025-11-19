import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

/**
 * POST /api/teachers/assignments/[id]/attempts/override
 * Giáo viên can thiệp phiên làm bài của một học sinh: gia hạn, tạm dừng, tiếp tục, chấm dứt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teacher = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Missing assignmentId" },
        { status: 400 }
      );
    }

    const isOwner = await isTeacherOfAssignment(teacher.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not your assignment" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null as any);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON" },
        { status: 400 }
      );
    }

    const {
      studentId,
      attemptNumber,
      action,
      minutes,
      reason,
    }: {
      studentId: string;
      attemptNumber?: number | null;
      action: "EXTEND_TIME" | "PAUSE" | "RESUME" | "TERMINATE";
      minutes?: number;
      reason?: string;
    } = body;

    if (!studentId || !action) {
      return NextResponse.json(
        { success: false, message: "Missing studentId or action" },
        { status: 400 }
      );
    }

    // Tìm attempt hiện tại của học sinh
    const attemptWhere: any = {
      assignmentId,
      studentId,
    };

    if (typeof attemptNumber === "number") {
      attemptWhere.attemptNumber = attemptNumber;
    }

    const targetAttempt = await prisma.assignmentAttempt.findFirst({
      where: attemptWhere,
      orderBy: { startedAt: "desc" },
    });

    if (!targetAttempt) {
      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy lần làm bài phù hợp cho học sinh này",
        },
        { status: 404 }
      );
    }

    const now = new Date();
    const updateData: any = {};

    switch (action) {
      case "EXTEND_TIME": {
        const m = typeof minutes === "number" ? minutes : 0;
        if (m <= 0) {
          return NextResponse.json(
            { success: false, message: "Số phút gia hạn phải > 0" },
            { status: 400 }
          );
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
        updateData.status = "TERMINATED_BY_TEACHER";
        updateData.endedAt = now;
        break;
      }
      default: {
        return NextResponse.json(
          { success: false, message: "Unsupported action" },
          { status: 400 }
        );
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
          } as any,
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
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
