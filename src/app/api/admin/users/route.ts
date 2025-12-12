import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import bcrypt from "bcryptjs";
import { userRepo } from "@/lib/repositories/user-repo";

const ALLOWED_ROLES = ["TEACHER", "STUDENT", "PARENT", "ADMIN"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const role = searchParams.get("role") || undefined;
    const search = searchParams.get("q") || undefined;

    const where: Prisma.UserWhereInput = {};

    if (role && (ALLOWED_ROLES as readonly string[]).includes(role)) {
      where.role = role as any;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ];
    }

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
      for (const item of disabledSetting as any[]) {
        if (typeof item === "string") {
          disabledMap.set(item, null);
        } else if (item && typeof item === "object" && typeof (item as any).id === "string") {
          const it = item as any;
          disabledMap.set(
            it.id,
            typeof it.reason === "string" && it.reason.trim().length > 0
              ? it.reason.trim()
              : null
          );
        }
      }
    }

    const itemsWithStatus = items.map((u) => ({
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
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const fullname = (body?.fullname || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const password = (body?.password || "").toString();

    if (!fullname) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập họ và tên." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập email." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Email không hợp lệ." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Email đã được sử dụng." },
        { status: 409 }
      );
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
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
