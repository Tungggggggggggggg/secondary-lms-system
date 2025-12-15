import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

const querySchema = z
  .object({
    attemptNumber: z.string().optional(),
  })
  .strict();

/**
 * GET /api/students/assignments/[id]/attempts/status
 * Trả về trạng thái attempt hiện tại (hoặc mới nhất) của học sinh cho assignment này.
 */
export async function GET(
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

    // Kiểm tra student thuộc classroom có assignment này hay không
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    const url = new URL(req.url);
    const parsedQuery = querySchema.safeParse({
      attemptNumber: url.searchParams.get("attemptNumber") ?? undefined,
    });
    if (!parsedQuery.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedQuery.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const rawAttemptNumber = parsedQuery.data.attemptNumber;
    const attemptNumber = rawAttemptNumber === undefined ? undefined : Number(rawAttemptNumber);
    if (attemptNumber !== undefined && (!Number.isInteger(attemptNumber) || attemptNumber < 1)) {
      return errorResponse(400, "attemptNumber không hợp lệ");
    }

    const where = {
      assignmentId,
      studentId: user.id,
      ...(attemptNumber !== undefined ? { attemptNumber } : {}),
    };

    const attempt = await prisma.assignmentAttempt.findFirst({
      where,
      orderBy: { startedAt: "desc" },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: attempt.id,
          assignmentId: attempt.assignmentId,
          studentId: attempt.studentId,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status ?? null,
          timeLimitMinutes: attempt.timeLimitMinutes ?? null,
          startedAt: attempt.startedAt.toISOString(),
          endedAt: attempt.endedAt ? attempt.endedAt.toISOString() : null,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/attempts/status - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}
