import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { totalUnreadCount } from "@/lib/repositories/chat";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const total = await totalUnreadCount(user.id);
  return NextResponse.json({ success: true, total });
}
