import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";
import { generateEssayGradeSuggestion } from "@/lib/ai/gemini-grade";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

const requestSchema = z.object({
  assignmentId: z.string().min(1),
  submissionId: z.string().min(1),
});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", details: null, retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "ai_grade_ip",
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const userLimit = await checkRateLimit({
      scope: "ai_grade_teacher",
      key: user.id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!userLimit.allowed) {
      return rateLimitResponse(userLimit.retryAfterSeconds);
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { assignmentId, submissionId } = parsed.data;

    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden - Not your assignment");
    }

    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
      },
      select: {
        id: true,
        content: true,
        student: {
          select: {
            fullname: true,
          },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
          },
        },
      },
    });

    if (!submission) {
      return errorResponse(404, "Submission not found");
    }

    if (submission.assignment.type !== "ESSAY") {
      return errorResponse(400, "Chỉ hỗ trợ AI auto-grading cho bài tự luận (ESSAY) ở phiên bản MVP.");
    }

    if (!submission.content || !submission.content.trim()) {
      return errorResponse(400, "Nội dung bài nộp trống");
    }

    const suggestion = await generateEssayGradeSuggestion({
      assignmentTitle: submission.assignment.title,
      assignmentDescription: submission.assignment.description,
      studentName: submission.student.fullname,
      submissionText: submission.content,
      maxScore: 10,
    });

    try {
      await auditRepo.write({
        actorId: user.id,
        actorRole: "TEACHER",
        action: "AI_GRADE_SUGGESTION",
        entityType: "ASSIGNMENT_SUBMISSION",
        entityId: submission.id,
        metadata: {
          assignmentId,
          model: "gemini-2.5-flash-lite",
          score: suggestion.score,
        },
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        data: suggestion,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/ai/grade] Error", error);
    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (error.message === "Bài làm trống.") {
        return errorResponse(400, "Nội dung bài nộp trống");
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
