import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, withApiLogging } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import {
  generateParentSmartSummary,
  type ParentGradeSnapshotItem,
} from "@/lib/ai/gemini-parent-summary";

const requestSchema = z.object({
  childId: z.string().min(1),
  windowDays: z.number().int().min(7).max(90).optional().default(30),
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

export const POST = withApiLogging(async (req: NextRequest) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return errorResponse(401, "Unauthorized");
    }

    if (authUser.role !== "PARENT") {
      return errorResponse(403, "Forbidden - PARENT role required");
    }

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "ai_parent_summary_ip",
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const userLimit = await checkRateLimit({
      scope: "ai_parent_summary_parent",
      key: authUser.id,
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

    const { childId, windowDays } = parsed.data;

    const relationship = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: authUser.id,
          studentId: childId,
        },
      },
      select: { status: true },
    });

    if (!relationship) {
      return errorResponse(403, "Forbidden - No relationship found with this student");
    }

    if (relationship.status !== "ACTIVE") {
      return errorResponse(403, "Forbidden - Relationship is not active");
    }

    const student = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, role: true, fullname: true },
    });

    if (!student || student.role !== "STUDENT") {
      return errorResponse(404, "Student not found");
    }

    const now = new Date();
    const fromDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const classroomLinks = await prisma.classroomStudent.findMany({
      where: { studentId: childId },
      select: { classroomId: true },
    });

    const classroomIds = classroomLinks.map((cs) => cs.classroomId);
    if (classroomIds.length === 0) {
      const empty = await generateParentSmartSummary({
        studentName: student.fullname || "Học sinh",
        windowDays,
        averageGrade: 0,
        totalGraded: 0,
        totalSubmitted: 0,
        totalPending: 0,
        items: [],
      });

      try {
        await auditRepo.write({
          actorId: authUser.id,
          actorRole: "PARENT",
          action: "AI_PARENT_SMART_SUMMARY",
          entityType: "USER",
          entityId: childId,
          metadata: { windowDays },
          ip,
          userAgent: req.headers.get("user-agent"),
        });
      } catch {}

      return NextResponse.json({ success: true, data: empty }, { status: 200 });
    }

    const assignmentLinks = await prisma.assignmentClassroom.findMany({
      where: { classroomId: { in: classroomIds } },
      select: { assignmentId: true },
    });

    const assignmentIds = Array.from(new Set(assignmentLinks.map((a) => a.assignmentId)));
    if (assignmentIds.length === 0) {
      const empty = await generateParentSmartSummary({
        studentName: student.fullname || "Học sinh",
        windowDays,
        averageGrade: 0,
        totalGraded: 0,
        totalSubmitted: 0,
        totalPending: 0,
        items: [],
      });

      try {
        await auditRepo.write({
          actorId: authUser.id,
          actorRole: "PARENT",
          action: "AI_PARENT_SMART_SUMMARY",
          entityType: "USER",
          entityId: childId,
          metadata: { windowDays },
          ip,
          userAgent: req.headers.get("user-agent"),
        });
      } catch {}

      return NextResponse.json({ success: true, data: empty }, { status: 200 });
    }

    const [assignments, assignmentClassrooms, submissions] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          id: { in: assignmentIds },
          OR: [
            { dueDate: { gte: fromDate } },
            { dueDate: null },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          dueDate: true,
        },
      }),
      prisma.assignmentClassroom.findMany({
        where: { assignmentId: { in: assignmentIds } },
        select: {
          assignmentId: true,
          classroom: { select: { name: true } },
        },
        orderBy: { addedAt: "desc" },
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          studentId: childId,
          assignmentId: { in: assignmentIds },
          submittedAt: { gte: fromDate },
        },
        select: {
          id: true,
          assignmentId: true,
          submittedAt: true,
          grade: true,
          feedback: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 120,
      }),
    ]);

    const assignmentById = new Map(assignments.map((a) => [a.id, a]));

    const classroomNameByAssignmentId = new Map<string, string>();
    for (const row of assignmentClassrooms) {
      if (!classroomNameByAssignmentId.has(row.assignmentId)) {
        classroomNameByAssignmentId.set(row.assignmentId, row.classroom.name);
      }
    }

    const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));

    const pendingItems: ParentGradeSnapshotItem[] = [];
    for (const a of assignments) {
      if (submittedAssignmentIds.has(a.id)) continue;
      if (!a.dueDate) continue;
      if (a.dueDate < fromDate) continue;

      pendingItems.push({
        assignmentTitle: a.title,
        assignmentType: a.type,
        classroomName: classroomNameByAssignmentId.get(a.id) ?? null,
        dueDate: a.dueDate.toISOString(),
        submittedAt: null,
        grade: null,
        feedback: null,
        status: a.dueDate < now ? "overdue" : "pending",
      });
    }

    const submissionItems = submissions
      .map((s): ParentGradeSnapshotItem | null => {
        const a = assignmentById.get(s.assignmentId);
        if (!a) return null;
        return {
          assignmentTitle: a.title,
          assignmentType: a.type,
          classroomName: classroomNameByAssignmentId.get(a.id) ?? null,
          dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          submittedAt: s.submittedAt.toISOString(),
          grade: s.grade,
          feedback: s.feedback,
          status: s.grade !== null ? "graded" : "submitted",
        };
      })
      .filter((x): x is ParentGradeSnapshotItem => x !== null);

    const items = [...submissionItems, ...pendingItems]
      .slice(0, 60);

    const graded = submissions.filter((s) => s.grade !== null);
    const totalGraded = graded.length;
    const averageGrade =
      totalGraded > 0
        ? graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / totalGraded
        : 0;

    const totalSubmitted = submissions.length;
    const totalPending = pendingItems.length + submissions.filter((s) => s.grade === null).length;

    const summary = await generateParentSmartSummary({
      studentName: student.fullname || "Học sinh",
      windowDays,
      averageGrade: Math.round(averageGrade * 10) / 10,
      totalGraded,
      totalSubmitted,
      totalPending,
      items,
    });

    try {
      await auditRepo.write({
        actorId: authUser.id,
        actorRole: "PARENT",
        action: "AI_PARENT_SMART_SUMMARY",
        entityType: "USER",
        entityId: childId,
        metadata: { windowDays },
        ip,
        userAgent: req.headers.get("user-agent"),
      });
    } catch {}

    return NextResponse.json({ success: true, data: summary }, { status: 200 });
  } catch (error) {
    console.error("[API /api/ai/parent/summary] Error", error);

    if (error instanceof Error) {
      if (/GEMINI_API_KEY/i.test(error.message)) {
        return errorResponse(500, "Dịch vụ AI chưa được cấu hình.");
      }
      if (/Phản hồi AI không đúng định dạng/i.test(error.message)) {
        return errorResponse(502, "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
      }
      if (/Không parse được JSON/i.test(error.message)) {
        return errorResponse(502, "AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.");
      }
    }

    return errorResponse(500, "Internal server error");
  }
}, "AI_PARENT_SMART_SUMMARY");
