import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized");
    }

    const items = await notificationRepo.list(user.id, { limit: 50 });
    const unread = items.filter((i) => !i.read).length;

    return NextResponse.json(
      {
        success: true,
        data: items,
        items,
        unread,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/notifications] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

