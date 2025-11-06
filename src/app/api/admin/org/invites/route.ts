import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import jwt from "jsonwebtoken";
import { requireOrgAccess } from "@/lib/org-scope";
import { writeAudit } from "@/lib/logging/audit";

// POST /api/admin/org/invites
// body: { orgId: string, email: string, role?: 'TEACHER'|'STUDENT'|'PARENT'|'ADMIN' }
// Trả về token mời (JWT) hết hạn sau 3 ngày. ADMIN hoặc SUPER_ADMIN.
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "ADMIN" && authUser.role !== "SUPER_ADMIN") {
    return errorResponse(403, "Forbidden: ADMIN/SUPER_ADMIN only");
  }

  const secret = process.env.NEXTAUTH_SECRET as string | undefined;
  if (!secret) return errorResponse(500, "Missing NEXTAUTH_SECRET");

  let body: { orgId?: string; email?: string; role?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!body.orgId || !body.email) return errorResponse(400, "orgId and email are required");
  try { await requireOrgAccess(req, authUser, body.orgId); } catch { return errorResponse(403, "Forbidden: not a member of organization"); }

  const allowedRoles = ["TEACHER", "STUDENT", "PARENT", "ADMIN"] as const;
  const role = body.role && (allowedRoles as readonly string[]).includes(body.role) ? body.role : "STUDENT";

  const token = jwt.sign({ orgId: body.orgId, email: body.email, role }, secret, { expiresIn: "3d" });
  await writeAudit({ actorId: authUser.id, action: "ORG_INVITE_CREATE", entityType: "ORGANIZATION", entityId: body.orgId, metadata: { email: body.email, role } });
  return NextResponse.json({ success: true, token });
}, "ADMIN_ORG_INVITE_CREATE");


