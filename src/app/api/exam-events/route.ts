import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  getAuthenticatedUser,
  getStudentClassroomForAssignment,
  isTeacherOfAssignment,
} from "@/lib/api-utils";

const getQuerySchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1).optional(),
  attempt: z.coerce.number().int().min(1).max(999).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  from: z.string().optional(),
  to: z.string().optional(),
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
    });

    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { assignmentId, studentId, attempt, limit, from, to } = parsed.data;

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
    if (fromDate && Number.isNaN(fromDate.getTime())) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "from: Invalid date" });
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      return errorResponse(400, "Dữ liệu không hợp lệ", { details: "to: Invalid date" });
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
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
        student: { select: { id: true, fullname: true, email: true } },
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

    const prismaMetadata: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined =
      metadata === undefined ? undefined : metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);

    await prisma.examEvent.create({
      data: {
        assignmentId,
        studentId: me.id,
        attempt: typeof attempt === "number" ? attempt : undefined,
        eventType,
        metadata: prismaMetadata,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error("[ERROR] [POST] /api/exam-events", error);
    return errorResponse(500, "Internal server error");
  }
}
