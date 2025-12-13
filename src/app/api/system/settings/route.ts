import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getAuthenticatedUser, withApiLogging } from "@/lib/api-utils";
import { settingsRepo } from "@/lib/repositories/settings-repo";

const MAINTENANCE_KEY = "system:maintenance";
const ANNOUNCEMENT_KEY = "system:announcement";

const MaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(1000).optional().nullable().default(null),
});

const AnnouncementSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(2000).optional().nullable().default(null),
});

function normalizeMaintenance(raw: unknown) {
  const parsed = MaintenanceSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { enabled: false, message: null };
}

function normalizeAnnouncement(raw: unknown) {
  const parsed = AnnouncementSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return { enabled: false, message: null };
}

export const GET = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  try {
    const [m, a] = await Promise.all([
      settingsRepo.get(MAINTENANCE_KEY),
      settingsRepo.get(ANNOUNCEMENT_KEY),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          maintenance: normalizeMaintenance(m),
          announcement: normalizeAnnouncement(a),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/system/settings] Error", error);
    return errorResponse(500, "Internal server error");
  }
}, "SYSTEM_SETTINGS_GET");
