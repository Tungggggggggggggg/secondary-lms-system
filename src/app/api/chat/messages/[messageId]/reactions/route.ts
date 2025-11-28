import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { addReaction, removeReaction, getMessageConversationId } from "@/lib/repositories/chat";
import { isConversationParticipant } from "@/lib/repositories/chat";

export async function POST(req: NextRequest, { params }: { params: { messageId: string } }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const { messageId } = params;
  if (!messageId) return errorResponse(400, "Thiếu messageId");

  try {
    const { emoji } = await req.json();
    if (!emoji) return errorResponse(400, "Thiếu emoji");

    const conversationId = await getMessageConversationId(messageId);
    if (!conversationId) return errorResponse(404, "Không tìm thấy tin nhắn");

    const allowed = await isConversationParticipant(conversationId, user.id);
    if (!allowed) return errorResponse(403, "Forbidden");

    await addReaction(messageId, user.id, emoji);
    return NextResponse.json({ success: true });

  } catch (e) {
    logger.error("chat:addReaction:error", { messageId, userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi khi thêm reaction");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { messageId: string } }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const { messageId } = params;
  if (!messageId) return errorResponse(400, "Thiếu messageId");

  try {
    const { emoji } = await req.json();
    if (!emoji) return errorResponse(400, "Thiếu emoji");

    // We don't need to check for conversation participant here, 
    // as you should only be able to delete your own reaction.
    await removeReaction(messageId, user.id, emoji);
    return NextResponse.json({ success: true });

  } catch (e) {
    logger.error("chat:removeReaction:error", { messageId, userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi khi xóa reaction");
  }
}
