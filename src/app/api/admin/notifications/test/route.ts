import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, withApiLogging } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

const BodySchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    actionUrl: z.string().max(1000).optional().nullable(),
    type: z.string().max(80).optional().nullable(),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
    dedupeKey: z.string().max(200).optional().nullable(),
  })
  .default({});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", details: null, retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export const POST = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  if (user.role !== "ADMIN") return errorResponse(403, "Forbidden - Admins only");

  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    scope: "admin_notifications_test",
    key: `${user.id}:${ip}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const title = parsed.data.title ?? "Thông báo test cho Admin";
  const description = parsed.data.description ?? "Bạn có thể bỏ qua thông báo này.";
  const actionUrl = parsed.data.actionUrl ?? "/dashboard/admin/dashboard";
  const type = parsed.data.type ?? "TEST";
  const severity = parsed.data.severity ?? "INFO";
  const dedupeKey = parsed.data.dedupeKey ?? undefined;

  try {
    const item = await notificationRepo.add(user.id, {
      title,
      description,
      actionUrl,
      type,
      severity,
      dedupeKey,
      meta: {
        source: "api/admin/notifications/test",
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/notifications/test] Error", error);
    return errorResponse(500, "Internal server error");
  }
}, "ADMIN_NOTIFICATIONS_TEST_POST");
