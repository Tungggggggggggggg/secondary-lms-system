import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { isConversationParticipant, listAttachments } from "@/lib/repositories/chat";

export async function GET(req: NextRequest, { params }: { params: { conversationId: string } }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const { conversationId } = params;
  if (!conversationId) return errorResponse(400, "Thiếu conversationId");

  const allowed = await isConversationParticipant(conversationId, user.id);
  if (!allowed) return errorResponse(403, "Forbidden");

  try {
    const attachments = await listAttachments(conversationId);
    return NextResponse.json({ success: true, data: attachments });
  } catch (e) {
    logger.error("chat:listAttachments:error", { conversationId, userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi khi tải tệp đính kèm");
  }
}
