import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import bcrypt from "bcryptjs";
import { userRepo } from "@/lib/repositories/user-repo";
import { errorResponse } from "@/lib/api-utils";

const ALLOWED_ROLES = ["TEACHER", "STUDENT", "PARENT", "ADMIN"] as const;

function isAllowedRole(value: string): value is (typeof ALLOWED_ROLES)[number] {
  return (ALLOWED_ROLES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const role = searchParams.get("role") || undefined;
    const search = searchParams.get("q") || undefined;

    const where = {
      ...(role && isAllowedRole(role) ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { fullname: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, items, disabledSetting] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          fullname: true,
          role: true,
          createdAt: true,
        },
      }),
      settingsRepo.get("disabled_users"),
    ]);

    const disabledMap = new Map<string, string | null>();
    if (Array.isArray(disabledSetting)) {
      for (const item of disabledSetting) {
        if (typeof item === "string") {
          disabledMap.set(item, null);
          continue;
        }
        if (isRecord(item) && typeof item.id === "string") {
          const rawReason = item.reason;
          const reason =
            typeof rawReason === "string" && rawReason.trim().length > 0
              ? rawReason.trim()
              : null;
          disabledMap.set(item.id, reason);
        }
      }
    }

    const itemsWithStatus = items.map((u: { id: string; email: string; fullname: string; role: string; createdAt: Date }) => ({
      ...u,
      isDisabled: disabledMap.has(u.id),
      disabledReason: disabledMap.get(u.id) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: itemsWithStatus,
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/users] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const body = await req.json().catch(() => null);
    const fullname = (body?.fullname || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const password = (body?.password || "").toString();

    if (!fullname) {
      return errorResponse(400, "Vui lòng nhập họ và tên.");
    }

    if (!email) {
      return errorResponse(400, "Vui lòng nhập email.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(400, "Email không hợp lệ.");
    }

    if (!password || password.length < 6) {
      return errorResponse(400, "Mật khẩu phải có ít nhất 6 ký tự.");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse(409, "Email đã được sử dụng.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await userRepo.createUser({
      email,
      fullname,
      passwordHash,
      globalRole: "TEACHER",
      organizationId: null,
    });

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("[API /api/admin/users POST] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
