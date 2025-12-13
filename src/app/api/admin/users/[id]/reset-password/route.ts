import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { generateResetToken } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

const requestSchema = z.object({
  reason: z.string().max(500).optional(),
});

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: "Too many requests", retryAfterSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Admin tạo mã reset password và gửi email cho user.
 */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const targetUserId = ctx?.params?.id;
    if (!targetUserId) {
      return errorResponse(400, "Missing user id");
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: "admin_reset_password_ip",
      key: ip,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const adminLimit = await checkRateLimit({
      scope: "admin_reset_password_admin",
      key: session.user.id,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!adminLimit.allowed) {
      return rateLimitResponse(adminLimit.retryAfterSeconds);
    }

    const targetLimit = await checkRateLimit({
      scope: "admin_reset_password_target",
      key: targetUserId,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!targetLimit.allowed) {
      return rateLimitResponse(targetLimit.retryAfterSeconds);
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, fullname: true, role: true },
    });

    if (!target) {
      return errorResponse(404, "User not found");
    }

    if (String(target.role) === "ADMIN") {
      return errorResponse(400, "Không thể reset mật khẩu tài khoản ADMIN qua chức năng này");
    }

    const token = generateResetToken();

    await prisma.passwordReset.deleteMany({
      where: {
        email: target.email,
        completed: false,
      },
    });

    await prisma.passwordReset.create({
      data: {
        email: target.email,
        token,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: target.email,
      subject: "🔐 Yêu cầu đặt lại mật khẩu (Admin)",
      html: `
        <h2>Xin chào${target.fullname ? ` ${target.fullname}` : ""}!</h2>
        <p>Quản trị viên đã khởi tạo yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Đây là mã xác nhận của bạn:</p>
        <div style="
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 8px;
        ">
          ${token}
        </div>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng liên hệ quản trị viên.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>Secondary LMS System</p>
      `,
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "ADMIN_PASSWORD_RESET_SEND_CODE",
        entityType: "USER",
        entityId: target.id,
        metadata: {
          targetEmail: target.email,
          ip,
          reason: parsed.data.reason?.trim() || null,
        },
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: "Đã gửi mã reset password tới email người dùng",
        data: { id: target.id, email: target.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/admin/users/[id]/reset-password] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
