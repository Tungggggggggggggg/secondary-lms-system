import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

const paramsSchema = z.object({
  id: z.string().min(1, "Missing id"),
});

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized");
    }

    const parsed = paramsSchema.safeParse(ctx?.params);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const item = await notificationRepo.get(user.id, parsed.data.id);
    if (!item) {
      return errorResponse(404, "Notification not found");
    }

    return NextResponse.json({ success: true, data: item }, { status: 200 });
  } catch (error) {
    console.error("[API /api/notifications/[id]] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized");
    }

    const parsed = paramsSchema.safeParse(ctx?.params);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    const updated = await notificationRepo.markRead(user.id, parsed.data.id);
    if (!updated) {
      return errorResponse(404, "Notification not found");
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[API /api/notifications/[id] PATCH] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

