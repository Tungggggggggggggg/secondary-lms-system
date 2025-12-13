import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { userRepo } from "@/lib/repositories/user-repo";
import { errorResponse } from "@/lib/api-utils";

type BulkEntryInput = {
  fullname?: string;
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const body = await req.json().catch(() => null);
    const entriesRaw = (body?.entries || []) as BulkEntryInput[];
    const defaultPassword = (body?.defaultPassword || "").toString();

    if (!Array.isArray(entriesRaw) || entriesRaw.length === 0) {
      return errorResponse(400, "Danh sách giáo viên trống.");
    }

    if (entriesRaw.length > 100) {
      return errorResponse(400, "Tối đa 100 giáo viên mỗi lần tạo.");
    }

    type Candidate = {
      index: number;
      fullname: string;
      email: string;
      password: string;
    };

    const candidates: Candidate[] = [];
    const failed: { index: number; email: string; reason: string }[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    entriesRaw.forEach((entry, index) => {
      const fullname = (entry.fullname || "").toString().trim();
      const email = (entry.email || "").toString().trim().toLowerCase();
      const password = (entry.password || defaultPassword || "").toString();

      if (!fullname || !email) {
        failed.push({ index, email, reason: "Thiếu họ tên hoặc email" });
        return;
      }
      if (!emailRegex.test(email)) {
        failed.push({ index, email, reason: "Email không hợp lệ" });
        return;
      }
      if (!password || password.length < 6) {
        failed.push({ index, email, reason: "Mật khẩu phải có ít nhất 6 ký tự" });
        return;
      }

      candidates.push({ index, fullname, email, password });
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Không có dòng hợp lệ để tạo giáo viên.",
        data: { created: [], failed },
      });
    }

    const emailToIndices = new Map<string, number[]>();
    for (const c of candidates) {
      const list = emailToIndices.get(c.email) || [];
      list.push(c.index);
      emailToIndices.set(c.email, list);
    }

    const uniqueCandidates: Candidate[] = [];
    for (const c of candidates) {
      const indices = emailToIndices.get(c.email) || [];
      if (indices[0] !== c.index) {
        failed.push({ index: c.index, email: c.email, reason: "Trùng email trong danh sách" });
        continue;
      }
      uniqueCandidates.push(c);
    }

    if (uniqueCandidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Tất cả email trong danh sách đều bị trùng hoặc không hợp lệ.",
        data: { created: [], failed },
      });
    }

    const existing = await prisma.user.findMany({
      where: { email: { in: uniqueCandidates.map((c) => c.email) } },
      select: { email: true },
    });
    const existingSet = new Set(existing.map((u: { email: string }) => u.email.toLowerCase()));

    const created: { index: number; id: string; email: string; fullname: string | null }[] = [];

    for (const c of uniqueCandidates) {
      if (existingSet.has(c.email)) {
        failed.push({ index: c.index, email: c.email, reason: "Email đã tồn tại trong hệ thống" });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(c.password, 10);
        const user = await userRepo.createUser({
          email: c.email,
          fullname: c.fullname,
          passwordHash,
          globalRole: "TEACHER",
          organizationId: null,
        });
        created.push({
          index: c.index,
          id: user.id,
          email: user.email,
          fullname: user.fullname,
        });
      } catch (e: unknown) {
        const reason =
          !!e &&
          typeof e === "object" &&
          "code" in e &&
          (e as { code?: unknown }).code === "P2002"
            ? "Email đã tồn tại (unique constraint)"
            : "Lỗi khi tạo user";
        failed.push({ index: c.index, email: c.email, reason });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        failed,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/users/bulk POST] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
