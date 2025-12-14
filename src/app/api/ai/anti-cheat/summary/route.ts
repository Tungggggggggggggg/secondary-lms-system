import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  isTeacherOfAssignment,
} from "@/lib/api-utils";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { computeQuizAntiCheatScore } from "@/lib/exam-session/antiCheatScoring";
import { generateAntiCheatAiSummary } from "@/lib/ai/gemini-anti-cheat-summary";

export const runtime = "nodejs";

const requestSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  attempt: z.number().int().min(1).max(999).optional().nullable(),
});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * POST /api/ai/anti-cheat/summary
 * Teacher-only: sinh tóm tắt chống gian lận từ exam_events (quiz).
 */
export async function POST(req: NextRequest) {
  try {
    const teacher = await getAuthenticatedUser(req, "TEACHER");
    if (!teacher) return errorResponse(401, "Unauthorized");

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "ai_anti_cheat_ip",
      key: ip,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const userLimit = await checkRateLimit({
      scope: "ai_anti_cheat_teacher",
      key: teacher.id,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfterSeconds);
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const parsed = requestSchema.safeParse({
      assignmentId:
        body && typeof body === "object" && body !== null && "assignmentId" in body
          ? String((body as { assignmentId?: unknown }).assignmentId ?? "")
          : "",
      studentId:
        body && typeof body === "object" && body !== null && "studentId" in body
          ? String((body as { studentId?: unknown }).studentId ?? "")
          : "",
      attempt:
        body && typeof body === "object" && body !== null && "attempt" in body
          ? ((body as { attempt?: unknown }).attempt === undefined || (body as { attempt?: unknown }).attempt === null
              ? null
              : Number((body as { attempt?: unknown }).attempt))
          : null,
    });
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }

    const { assignmentId, studentId, attempt } = parsed.data;

    const isOwner = await isTeacherOfAssignment(teacher.id, assignmentId);
    if (!isOwner) return errorResponse(403, "Forbidden - Not your assignment");

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true, type: true },
    });

    if (!assignment) return errorResponse(404, "Assignment not found");
    if (assignment.type !== "QUIZ") {
      return errorResponse(400, "P2.5 chỉ áp dụng cho Quiz (QUIZ)");
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, fullname: true, role: true },
    });
    if (!student || student.role !== "STUDENT") {
      return errorResponse(404, "Student not found");
    }

    const events = await prisma.examEvent.findMany({
      where: {
        assignmentId,
        studentId,
        attempt: attempt ?? undefined,
      },
      orderBy: { createdAt: "asc" },
      take: 250,
      select: {
        eventType: true,
        createdAt: true,
        metadata: true,
      },
    });

    const scoring = computeQuizAntiCheatScore(events);

    const summary = await generateAntiCheatAiSummary({
      assignmentTitle: assignment.title,
      studentName: student.fullname || student.id,
      attemptNumber: attempt ?? null,
      suspicionScore: scoring.suspicionScore,
      riskLevel: scoring.riskLevel,
      breakdown: scoring.breakdown.map((b) => ({
        ruleId: b.ruleId,
        title: b.title,
        count: b.count,
        points: b.points,
        maxPoints: b.maxPoints,
      })),
      events: events.map((e) => ({
        at: e.createdAt.toISOString(),
        type: e.eventType,
        meta:
          e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
            ? (e.metadata as Record<string, unknown>)
            : null,
      })),
    });

    try {
      await auditRepo.write({
        actorId: teacher.id,
        actorRole: "TEACHER",
        action: "AI_ANTI_CHEAT_SUMMARY",
        entityType: "Assignment",
        entityId: assignmentId,
        metadata: {
          studentId,
          attempt: attempt ?? null,
          suspicionScore: scoring.suspicionScore,
          riskLevel: scoring.riskLevel,
        },
        ip,
        userAgent: req.headers.get("user-agent"),
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: {
          ...summary,
          suspicionScore: scoring.suspicionScore,
          riskLevel: scoring.riskLevel,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API /api/ai/anti-cheat/summary] Error", error);
    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (
        /Phản hồi AI không đúng định dạng/i.test(error.message) ||
        /Không parse được JSON/i.test(error.message)
      ) {
        return errorResponse(502, "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
      }
      if (
        /models\//i.test(error.message) &&
        (/is not found/i.test(error.message) ||
          /not supported for generatecontent/i.test(error.message))
      ) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
      if (/không hỗ trợ các model/i.test(error.message)) {
        return errorResponse(502, "Dịch vụ AI đang tạm thời không khả dụng. Vui lòng thử lại sau.");
      }
    }

    return errorResponse(500, "Internal server error");
  }
}
