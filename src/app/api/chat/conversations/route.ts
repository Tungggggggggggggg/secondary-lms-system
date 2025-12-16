import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { ensureTeacherStudentConversation, listConversations, createConversation } from "@/lib/repositories/chat";
import prisma from "@/lib/prisma";
import { z } from "zod";

const postBodySchema = z
  .object({
    studentId: z.string().min(1).max(100).optional(),
    includeParents: z.boolean().optional(),
    classId: z.string().min(1).max(100).optional().nullable(),
    participantIds: z.array(z.string().min(1).max(100)).optional(),
    type: z.enum(["DM", "TRIAD", "GROUP"]).optional(),
    contextStudentId: z.string().min(1).max(100).optional().nullable(),
  })
  .passthrough();

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  try {
    const list = await listConversations(user.id);
    return NextResponse.json({ success: true, data: list });
  } catch (e) {
    logger.error("chat:listConversations:error", { userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi lấy danh sách hội thoại");
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const { studentId, includeParents, classId, participantIds, type, contextStudentId } = parsedBody.data;

    let conversationId: string | null = null;

    // Nhánh tối ưu cho giáo viên tạo hội thoại với học sinh (và phụ huynh)
    if (user.role === "TEACHER" && studentId) {
      conversationId = await ensureTeacherStudentConversation({
        teacherId: user.id,
        studentId,
        includeParents: !!includeParents,
        classId: classId || null,
      });
    } else if (Array.isArray(participantIds) && participantIds.length > 0) {
      // Nhánh generic: tạo hội thoại theo tập participants (đảm bảo self included)
      const unique: string[] = Array.from(new Set([...participantIds, user.id]));
      const t: "DM" | "TRIAD" | "GROUP" = type ?? (unique.length > 2 ? "GROUP" : "DM");

      if (user.role === "PARENT") {
        const others = unique.filter((id) => id !== user.id);
        if (others.length !== 1) {
          return errorResponse(403, "Chỉ hỗ trợ nhắn tin trực tiếp với giáo viên");
        }
        const teacherId = others[0];

        const teacher = await prisma.user.findUnique({
          where: { id: teacherId },
          select: { id: true, role: true },
        });
        if (!teacher || teacher.role !== "TEACHER") {
          return errorResponse(403, "Chỉ hỗ trợ nhắn tin trực tiếp với giáo viên");
        }

        const children = await prisma.parentStudent.findMany({
          where: { parentId: user.id, status: "ACTIVE" },
          select: { studentId: true },
        });
        const studentIds = children.map((c) => c.studentId);
        if (studentIds.length === 0) {
          return errorResponse(403, "Không có quyền nhắn tin với giáo viên này");
        }

        const related = await prisma.classroomStudent.findFirst({
          where: {
            studentId: { in: studentIds },
            classroom: {
              teacherId,
              isActive: true,
            },
          },
          select: { id: true },
        });
        if (!related) {
          return errorResponse(403, "Không có quyền nhắn tin với giáo viên này");
        }
      }

      conversationId = await createConversation({
        type: t,
        createdById: user.id,
        participantIds: unique,
        classId: classId || null,
        contextStudentId: contextStudentId || null,
      });
    }

    if (!conversationId) return errorResponse(400, "Thiếu tham số tạo hội thoại");

    logger.info("chat:createConversation", { userId: user.id, conversationId });
    return NextResponse.json({ success: true, conversationId });
  } catch (e) {
    logger.error("chat:createConversation:error", { userId: user?.id, error: String(e) });
    return errorResponse(500, "Lỗi tạo hội thoại");
  }
}
