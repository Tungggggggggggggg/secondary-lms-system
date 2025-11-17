import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { ensureTeacherStudentConversation, listConversations, createConversation } from "@/lib/repositories/chat";

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
    const body = await req.json();
    const { studentId, includeParents, classId, participantIds, type, contextStudentId } = body || {};

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
      const t: "DM" | "TRIAD" | "GROUP" = ((type as string) || (unique.length > 2 ? "GROUP" : "DM")) as any;
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
