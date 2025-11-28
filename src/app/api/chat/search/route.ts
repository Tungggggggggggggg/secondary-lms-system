import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { logger } from "@/lib/logging/logger";
import { searchMessages } from "@/lib/repositories/chat";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 3) {
    return errorResponse(400, "Cần ít nhất 3 ký tự để tìm kiếm");
  }

  try {
    const results = await searchMessages(user.id, query);
    return NextResponse.json({ success: true, data: results });
  } catch (e) {
    logger.error("chat:searchMessages:error", { userId: user.id, query, error: String(e) });
    return errorResponse(500, "Lỗi khi tìm kiếm tin nhắn");
  }
}
