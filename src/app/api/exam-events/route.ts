import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { coercePrismaJson } from "@/lib/prisma-json";
import { notificationRepo } from "@/lib/repositories/notification-repo";
import {
  errorResponse,
  getAuthenticatedUser,
  getStudentClassroomForAssignment,
  isTeacherOfAssignment,
} from "@/lib/api-utils";
import { withPerformanceTracking } from "@/lib/performance-monitor";

const getQuerySchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1).optional(),
  attempt: z.coerce.number().int().min(1).max(999).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  countOnly: z.string().optional(),
});

const postBodySchema = z.object({
  assignmentId: z.string().min(1),
  eventType: z.string().min(1).max(32),
  attempt: z
    .union([z.coerce.number().int().min(1).max(999), z.null()])
    .optional(),
  metadata: z.unknown().nullable().optional(),
});

/**
 * GET /api/exam-events
 * 
 * @param req - NextRequest
 * @returns Danh sách exam events của assignment (teacher-only)
 * @sideEffects Query database (examEvent)
 */
export async function GET(req: NextRequest) {
  try {
    const me = await getAuthenticatedUser(req);
    if (!me) return errorResponse(401, "Unauthorized");
    if (me.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const { searchParams } = new URL(req.url);
    const parsed = getQuerySchema.safeParse({
      assignmentId: searchParams.get("assignmentId") || "",
      studentId: searchParams.get("studentId") || undefined,
      attempt: searchParams.get("attempt") || undefined,
      limit: searchParams.get("limit") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      countOnly: searchParams.get("countOnly") || undefined,
    });

    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { assignmentId, studentId, attempt, limit, from, to, countOnly } = parsed.data;

    const countOnlyEnabled =
      typeof countOnly === "string" && (countOnly.trim() === "1" || countOnly.trim().toLowerCase() === "true");

    const allowed = await isTeacherOfAssignment(me.id, assignmentId);
    if (!allowed) return errorResponse(403, "Forbidden");

    const where: {
      assignmentId: string;
      studentId?: string;
      attempt?: number;
      createdAt?: { gte?: Date; lte?: Date };
    } = { assignmentId };

    if (studentId) where.studentId = studentId;
    if (typeof attempt === "number" && Number.isFinite(attempt)) where.attempt = attempt;

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "from: must be <= to" });
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    if (countOnlyEnabled) {
      const recordedEvents = await prisma.examEvent.count({ where });
      return NextResponse.json(
        { success: true, data: { recordedEvents } },
        { status: 200 }
      );
    }

    const events = await prisma.examEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        attempt: true,
        eventType: true,
        createdAt: true,
        metadata: true,
        student: { select: { id: true, fullname: true } },
      },
    });

    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error: unknown) {
    console.error("[ERROR] [GET] /api/exam-events", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * POST /api/exam-events
 * 
 * @param req - NextRequest
 * @returns success boolean (student-only)
 * @sideEffects Insert examEvent record
 */
export async function POST(req: NextRequest) {
  return withPerformanceTracking("/api/exam-events", "POST", async () => {
    try {
    const me = await getAuthenticatedUser(req);
    if (!me) return errorResponse(401, "Unauthorized");
    if (me.role !== "STUDENT") return errorResponse(403, "Forbidden");

    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = postBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { assignmentId, eventType, attempt, metadata } = parsed.data;

    const classroomId = await getStudentClassroomForAssignment(me.id, assignmentId);
    if (!classroomId) return errorResponse(403, "Forbidden");

    let metadataSize = 0;
    if (metadata !== undefined && metadata !== null) {
      try {
        metadataSize = JSON.stringify(metadata).length;
      } catch {
        return errorResponse(400, "Dữ liệu không hợp lệ", { details: "metadata: Invalid JSON" });
      }
    }
    if (metadataSize > 10_000) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "metadata: Payload too large" });
    }

    const prismaMetadata = coercePrismaJson(metadata);
    if (metadata !== undefined && prismaMetadata === undefined) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "metadata: Invalid JSON" });
    }

    await prisma.examEvent.create({
      data: {
        assignmentId,
        studentId: me.id,
        attempt: typeof attempt === "number" ? attempt : undefined,
        eventType,
        metadata: prismaMetadata,
      },
    });

    try {
      const warningEvents = new Set<string>([
        "TAB_SWITCH",
        "WINDOW_BLUR",
        "FULLSCREEN_EXIT",
        "COPY",
        "PASTE",
        "DEVTOOLS_OPEN",
        "MULTI_DEVICE",
        "DISCONNECT",
      ]);
      const criticalEvents = new Set<string>([
        "FULLSCREEN_EXIT",
        "DEVTOOLS_OPEN",
        "MULTI_DEVICE",
      ]);

      if (warningEvents.has(eventType)) {
        const assignment = await prisma.assignment.findUnique({
          where: { id: assignmentId },
          select: { id: true, title: true, authorId: true },
        });

        if (assignment?.authorId) {
          const minuteBucket = Math.floor(Date.now() / 60000);
          await notificationRepo.add(assignment.authorId, {
            type: "TEACHER_ANTI_CHEAT_ALERT",
            title: `Cảnh báo thi: ${assignment.title}`,
            description: `Sự kiện đáng ngờ: ${eventType}`,
            severity: criticalEvents.has(eventType) ? "CRITICAL" : "WARNING",
            actionUrl: `/dashboard/teacher/exams/monitor?assignmentId=${encodeURIComponent(assignmentId)}`,
            dedupeKey: `exam:${assignmentId}:${me.id}:${eventType}:${minuteBucket}`,
            meta: { assignmentId, studentId: me.id, eventType, attempt: typeof attempt === "number" ? attempt : null },
          });
        }
      }
    } catch {}

    return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
      console.error("[ERROR] [POST] /api/exam-events", error);
      return errorResponse(500, "Internal server error");
    }
  })();
}
