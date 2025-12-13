import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
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
const resetSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  token: z.string().length(6, 'Mã xác nhận phải có 6 ký tự'),
  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 số'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const { email, token, password } = parsed.data;

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: 'reset_password_reset_ip',
      key: ip,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const emailLimit = await checkRateLimit({
      scope: 'reset_password_reset_email',
      key: email.toLowerCase(),
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!emailLimit.allowed) {
      return rateLimitResponse(emailLimit.retryAfterSeconds);
    }

    // Kiểm tra token có tồn tại và còn hạn không
    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        email,
        token,
        completed: false,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!resetRequest) {
      return errorResponse(400, 'Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cập nhật mật khẩu và đánh dấu yêu cầu reset đã hoàn thành
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: { completed: true },
      }),
    ]);

    try {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (user?.id) {
        await auditRepo.write({
          actorId: user.id,
          actorRole: null,
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'USER',
          entityId: user.id,
          metadata: { ip },
        });
      }
    } catch {}

    return NextResponse.json(
      { success: true, message: 'Đặt lại mật khẩu thành công' },
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

    console.error('Error resetting password:', error);
    return errorResponse(500, 'Không thể đặt lại mật khẩu');
  }
}