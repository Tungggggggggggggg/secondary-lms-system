import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, withApiLogging } from "@/lib/api-utils";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

const MAINTENANCE_KEY = "system:maintenance";
const ANNOUNCEMENT_KEY = "system:announcement";

const MaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(1000).optional().nullable().default(null),
});

type Maintenance = z.infer<typeof MaintenanceSchema>;

const AnnouncementSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(2000).optional().nullable().default(null),
});

type Announcement = z.infer<typeof AnnouncementSchema>;

const SettingsSchema = z.object({
  maintenance: MaintenanceSchema,
  announcement: AnnouncementSchema,
});

type SystemSettings = z.infer<typeof SettingsSchema>;

const UpdateSchema = z.object({
  maintenance: MaintenanceSchema.partial().optional(),
  announcement: AnnouncementSchema.partial().optional(),
});

function normalizeMaintenance(raw: unknown): Maintenance {
  const parsed = MaintenanceSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { enabled: false, message: null };
}

function normalizeAnnouncement(raw: unknown): Announcement {
  const parsed = AnnouncementSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { enabled: false, message: null };
}

async function readSettings(): Promise<SystemSettings> {
  const [m, a] = await Promise.all([
    settingsRepo.get(MAINTENANCE_KEY),
    settingsRepo.get(ANNOUNCEMENT_KEY),
  ]);

  return {
    maintenance: normalizeMaintenance(m),
    announcement: normalizeAnnouncement(a),
  };
}

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", details: null, retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export const GET = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  if (user.role !== "ADMIN") return errorResponse(403, "Forbidden - Admins only");

  try {
    const data = await readSettings();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/settings] Error", error);
    return errorResponse(500, "Internal server error");
  }
}, "ADMIN_SETTINGS_GET");

export const PUT = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");
  if (user.role !== "ADMIN") return errorResponse(403, "Forbidden - Admins only");

  const ip = getClientIp(req);

  const rl = await checkRateLimit({
    scope: "admin_settings_update",
    key: `${user.id}:${ip}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSeconds);

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const current = await readSettings();

    const next: SystemSettings = {
      maintenance: { ...current.maintenance, ...(parsed.data.maintenance ?? {}) },
      announcement: { ...current.announcement, ...(parsed.data.announcement ?? {}) },
    };

    const validated = SettingsSchema.safeParse(next);
    if (!validated.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ");
    }

    await Promise.all([
      settingsRepo.set(MAINTENANCE_KEY, validated.data.maintenance),
      settingsRepo.set(ANNOUNCEMENT_KEY, validated.data.announcement),
    ]);

    try {
      await auditRepo.write({
        actorId: user.id,
        actorRole: "ADMIN",
        action: "ADMIN_SYSTEM_SETTINGS_UPDATE",
        entityType: "SYSTEM_SETTING",
        entityId: "system",
        metadata: {
          maintenanceEnabled: validated.data.maintenance.enabled,
          announcementEnabled: validated.data.announcement.enabled,
        },
        ip,
        userAgent: req.headers.get("user-agent"),
      });
    } catch {}

    return NextResponse.json({ success: true, data: validated.data }, { status: 200 });
  } catch (error) {
    console.error("[PUT /api/admin/settings] Error", error);
    return errorResponse(500, "Internal server error");
  }
}, "ADMIN_SETTINGS_PUT");
