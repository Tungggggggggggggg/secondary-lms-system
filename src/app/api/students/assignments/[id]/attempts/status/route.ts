import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

/**
 * GET /api/students/assignments/[id]/attempts/status
 * Trả về trạng thái attempt hiện tại (hoặc mới nhất) của học sinh cho assignment này.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser(req, "STUDENT");
    if (!user) {
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

    // Kiểm tra student thuộc classroom có assignment này hay không
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Not a member of this assignment's classroom" },
        { status: 403 }
      );
    }

    const url = new URL(req.url, "http://localhost");
    const attemptStr = url.searchParams.get("attemptNumber");
    const attemptNumber = attemptStr != null ? Number(attemptStr) : null;

    const where: any = {
      assignmentId,
      studentId: user.id,
    };

    if (attemptNumber != null && !Number.isNaN(attemptNumber)) {
      where.attemptNumber = attemptNumber;
    }

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
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
