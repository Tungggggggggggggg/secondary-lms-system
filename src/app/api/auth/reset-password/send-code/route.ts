import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { generateResetToken } from '@/lib/utils';
import { errorResponse } from '@/lib/api-utils';
import { auditRepo } from '@/lib/repositories/audit-repo';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { success: false, error: true, message: 'Too many requests', retryAfterSeconds },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

// Schema validate body request
const requestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const email = parsed.data.email;

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: 'reset_password_send_code_ip',
      key: ip,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const emailLimit = await checkRateLimit({
      scope: 'reset_password_send_code_email',
      key: email.toLowerCase(),
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfterSeconds);
    }

    // Kiểm tra email có tồn tại (không tiết lộ kết quả ra client)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Nếu email không tồn tại, trả OK để tránh user enumeration.
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi.',
        },
        { status: 200 }
      );
    }

    try {
      await auditRepo.write({
        actorId: user.id,
        actorRole: null,
        action: 'PASSWORD_RESET_SEND_CODE',
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          ip,
        },
      });
    } catch {}

    // Tạo token reset (mã 6 số ngẫu nhiên)
    const token = generateResetToken();

    // Lưu thông tin reset vào database
    // Trước khi tạo mới, xóa các yêu cầu cũ chưa hoàn thành của email này
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        completed: false,
      },
    });

    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
      },
    });

    // Gửi email chứa mã xác nhận
    await sendEmail({
      to: email,
      subject: '🔐 Mã xác nhận đặt lại mật khẩu',
      html: `
        <h2>Xin chào!</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
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
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>Secondary LMS System</p>
      `,
    });

    return NextResponse.json(
      { success: true, message: 'Mã xác nhận đã được gửi thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Error sending reset code:', error);
    return errorResponse(500, 'Không thể gửi mã xác nhận');
  }
}