import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { withApiLogging, errorResponse } from "@/lib/api-utils";
import { writeAudit } from "@/lib/logging/audit";

// POST /api/admin/org/invites/accept
// body: { token, fullname, password }
export const POST = withApiLogging(async (req: NextRequest) => {
  const secret = process.env.NEXTAUTH_SECRET as string | undefined;
  if (!secret) return errorResponse(500, "Missing NEXTAUTH_SECRET");

  let body: { token?: string; fullname?: string; password?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  if (!body.token || !body.fullname || !body.password) return errorResponse(400, "token, fullname, password required");

  let payload: any;
  try { payload = jwt.verify(body.token, secret); } catch { return errorResponse(400, "Invalid or expired token"); }

  const email: string = payload.email;
  const orgId: string = payload.orgId;
  const role: string = (payload.role || "STUDENT").toString().toUpperCase();

  const hashed = await bcrypt.hash(body.password, 10);

  // Tạo user nếu chưa có; nếu có thì không ghi đè mật khẩu
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullname: body.fullname, password: hashed, role: "STUDENT" as any },
  });

  // Thêm vào organization nếu chưa có
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    update: {},
    create: { organizationId: orgId, userId: user.id, roleInOrg: (["OWNER","ADMIN","TEACHER","STUDENT","PARENT"].includes(role) ? (role as any) : "STUDENT") },
  });

  await writeAudit({ actorId: user.id, action: "ORG_INVITE_ACCEPT", entityType: "ORGANIZATION", entityId: orgId, metadata: { email, role } });
  return NextResponse.json({ success: true, userId: user.id });
}, "ADMIN_ORG_INVITE_ACCEPT");


