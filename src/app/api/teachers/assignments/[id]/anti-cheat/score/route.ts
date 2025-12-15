import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  isTeacherOfAssignment,
} from "@/lib/api-utils";
import { computeQuizAntiCheatScore } from "@/lib/exam-session/antiCheatScoring";

export const runtime = "nodejs";

const querySchema = z.object({
  studentId: z.string().min(1).optional(),
  attempt: z.coerce.number().int().min(1).max(999).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

/**
 * GET /api/teachers/assignments/[id]/anti-cheat/score
 * Teacher-only: tính suspicionScore + breakdown từ exam_events cho assignment.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teacher = await getAuthenticatedUser(req);
    if (!teacher) return errorResponse(401, "Unauthorized");
    if (teacher.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;
    if (!assignmentId) return errorResponse(400, "Missing assignmentId");

    const isOwner = await isTeacherOfAssignment(teacher.id, assignmentId);
    if (!isOwner) return errorResponse(403, "Forbidden - Not your assignment");

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, type: true },
    });

    if (!assignment) return errorResponse(404, "Assignment not found");
    if (assignment.type !== "QUIZ") {
      return errorResponse(400, "P2.5 chỉ áp dụng cho Quiz (QUIZ)");
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      studentId: url.searchParams.get("studentId") || undefined,
      attempt: url.searchParams.get("attempt") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }

    const where: {
      assignmentId: string;
      studentId?: string;
      attempt?: number;
    } = { assignmentId };

    if (parsed.data.studentId) where.studentId = parsed.data.studentId;
    if (typeof parsed.data.attempt === "number" && Number.isFinite(parsed.data.attempt)) {
      where.attempt = parsed.data.attempt;
    }

    const events = await prisma.examEvent.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: parsed.data.limit,
      select: {
        eventType: true,
        createdAt: true,
        metadata: true,
      },
    });

    const score = computeQuizAntiCheatScore(events);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...score,
          totalEvents: events.length,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API /teachers/assignments/[id]/anti-cheat/score] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
