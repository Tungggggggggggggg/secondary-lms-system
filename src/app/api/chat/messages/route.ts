import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { isConversationParticipant, listMessages, addMessage } from "@/lib/repositories/chat";
import prisma from "@/lib/prisma";
import { notificationRepo } from "@/lib/repositories/notification-repo";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return errorResponse(400, "Thiếu conversationId");

  const allowed = await isConversationParticipant(conversationId, user.id);
  if (!allowed) return errorResponse(403, "Forbidden");

  try {
    const data = await listMessages(conversationId, 200);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    logger.error("chat:listMessages:error", { conversationId, userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi tải tin nhắn");
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  try {
    const { conversationId, content, attachments, parentId } = await req.json();
    if (!conversationId || ((!content || !content.trim()) && (!attachments || attachments.length === 0))) {
      return errorResponse(400, "Thiếu nội dung, tệp đính kèm hoặc conversationId");
    }

    const allowed = await isConversationParticipant(conversationId, user.id);
    if (!allowed) return errorResponse(403, "Forbidden");

    const msg = await addMessage(conversationId, user.id, (content || "").trim(), attachments, parentId);

    try {
      if (user.role === "TEACHER") {
        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: {
            userId: true,
            user: { select: { role: true, fullname: true } },
          },
        });

        const teacherName = user.fullname || "Giáo viên";
        const parentIds = participants
          .filter((p) => p.userId !== user.id && p.user?.role === "PARENT")
          .map((p) => p.userId);

        if (parentIds.length > 0) {
          await Promise.allSettled(
            parentIds.map((pid) =>
              notificationRepo.add(pid, {
                type: "PARENT_MESSAGE_NEW",
                title: `Tin nhắn mới từ ${teacherName}`,
                description: (content || "").trim().slice(0, 200),
                actionUrl: "/dashboard/parent/messages",
                dedupeKey: `chat:${msg.id}:${pid}`,
                meta: { messageId: msg.id, conversationId, senderId: user.id },
              })
            )
          );
        }
      }
    } catch {}

    return NextResponse.json({ success: true, message: msg });
  } catch (e) {
    logger.error("chat:sendMessage:error", { userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi gửi tin nhắn");
  }
}
