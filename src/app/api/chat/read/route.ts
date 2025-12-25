import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { isConversationParticipant, markRead } from "@/lib/repositories/chat";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  try {
    const { conversationId } = await req.json();
    if (!conversationId) return errorResponse(400, "Thiếu conversationId");

    const allowed = await isConversationParticipant(conversationId, user.id);
    if (!allowed) return errorResponse(403, "Forbidden");

    await markRead(conversationId, user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("chat:markRead:error", { userId: user.id, error: String(e) });
    return errorResponse(500, "Lỗi đánh dấu đã đọc");
  }
}
