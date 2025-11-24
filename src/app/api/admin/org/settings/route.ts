import { NextRequest, NextResponse } from "next/server";
import { withApiLogging, getAuthenticatedUser, errorResponse } from "@/lib/api-utils";
import { enforceRateLimit, RateLimitError } from "@/lib/http/rate-limit";
import { resolveOrgId } from "@/lib/org-scope";
import { orgSettingsRepo } from "@/lib/repositories/org-settings-repo";
import { writeAudit } from "@/lib/logging/audit";
import { requireOrgRead, requireOrgWrite } from "@/lib/rbac/guards";

export const GET = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") || resolveOrgId(req);
  if (!orgId) return errorResponse(400, "Missing orgId");

  try {
    enforceRateLimit({ route: "admin.org.settings.get", ip: (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim(), userId: user.id, orgId, limit: 60 });
    await requireOrgRead({ id: user.id, role: user.role }, orgId);
    const settings = await orgSettingsRepo.get(orgId);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    if (err instanceof RateLimitError) return errorResponse(429, err.message);
    return errorResponse(400, err?.message || "Failed to get org settings");
  }
}, "ADMIN_ORG_SETTINGS_GET");

export const PUT = withApiLogging(async (req: NextRequest) => {
  const user = await getAuthenticatedUser(req);
  if (!user) return errorResponse(401, "Unauthorized");

  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId") || resolveOrgId(req);
  if (!orgId) return errorResponse(400, "Missing orgId");

  let body: Partial<{ displayName: string; brandColor: string; contentPremoderation: boolean }> = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }

  try {
    enforceRateLimit({ route: "admin.org.settings.put", ip: (req.headers.get("x-forwarded-for") || (req as any).ip || "").split(",")[0].trim(), userId: user.id, orgId, limit: 30 });
    await requireOrgWrite({ id: user.id, role: user.role }, orgId);
    await orgSettingsRepo.set(orgId, {
      displayName: body.displayName,
      brandColor: body.brandColor,
      contentPremoderation: body.contentPremoderation,
    });
    try {
      await writeAudit({ actorId: user.id, action: "ORG_SETTINGS_UPDATE", entityType: "ORGANIZATION", entityId: orgId, metadata: { keys: Object.keys(body) } });
    } catch {}
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof RateLimitError) return errorResponse(429, err.message);
    return errorResponse(400, err?.message || "Failed to update org settings");
  }
}, "ADMIN_ORG_SETTINGS_PUT");
