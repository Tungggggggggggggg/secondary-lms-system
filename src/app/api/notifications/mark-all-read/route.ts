import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized");
    }

    const count = await notificationRepo.markAllRead(user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          count,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/notifications/mark-all-read] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
