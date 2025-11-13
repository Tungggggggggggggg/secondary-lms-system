import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import { writeAudit } from "@/lib/logging/audit";
import { parsePagination } from "@/lib/http/pagination";

// GET /api/admin/system/users
// Cho phép ADMIN và SUPER_ADMIN
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return errorResponse(401, "Unauthorized");
  }
  if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "ADMIN") {
    return errorResponse(403, "Forbidden: ADMIN or SUPER_ADMIN only");
  }

  const { searchParams } = new URL(req.url);
  const { skip, take } = parsePagination(searchParams, { defaultTake: 20, maxTake: 50 });
  const q = searchParams.get("q")?.trim();
  const roleParam = searchParams.get("role")?.trim();
  
  // Validate role parameter
  const validRoles = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"];
  const role = roleParam && validRoles.includes(roleParam) ? roleParam : null;

  // Build where clause with search and role filters
  const where: any = {};
  
  // Combine search and role filters properly
  if (q && role) {
    // Both search query and role filter
    where.AND = [
      {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { fullname: { contains: q, mode: "insensitive" } },
        ]
      },
      { role: role }
    ];
  } else if (q) {
    // Only search query
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { fullname: { contains: q, mode: "insensitive" } },
    ];
  } else if (role) {
    // Only role filter
    where.role = role;
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { 
        id: true, 
        email: true, 
        fullname: true, 
        role: true, 
        createdAt: true
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ success: true, items, total });
}, "ADMIN_SYSTEM_USERS_LIST");

// POST /api/admin/system/users
// Tạo user mới (SUPER_ADMIN)
export const POST = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  let body: { email?: string; fullname?: string; password?: string; role?: string } = {};
  try { body = await req.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const { email, fullname, password, role } = body;
  if (!email || !fullname || !password) return errorResponse(400, "email, fullname, password are required");

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"] as const;
  const roleToSet = role && (allowedRoles as readonly string[]).includes(role) ? role : "STUDENT";

  const hashed = await bcrypt.hash(password, 10);
  try {
    const created = await prisma.user.create({
      data: { email, fullname, password: hashed, role: roleToSet as any },
      select: { id: true, email: true, fullname: true, role: true, createdAt: true },
    });
    await writeAudit({ actorId: authUser.id, action: "USER_CREATE", entityType: "USER", entityId: created.id, metadata: { email, role: roleToSet } });
    return NextResponse.json({ success: true, user: created });
  } catch (e: any) {
    if (e?.code === "P2002") return errorResponse(409, "Email already exists");
    throw e;
  }
}, "ADMIN_SYSTEM_USERS_CREATE");


