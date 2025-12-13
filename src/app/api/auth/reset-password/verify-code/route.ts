import { NextResponse } from 'next/server';
import { z } from 'zod';
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
const verifySchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  token: z.string().length(6, 'Mã xác nhận phải có 6 ký tự'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const { email, token } = parsed.data;

    const ip = getClientIp(req);

    const ipLimit = await checkRateLimit({
      scope: 'reset_password_verify_ip',
      key: ip,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    if (!ipLimit.allowed) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    const emailLimit = await checkRateLimit({
      scope: 'reset_password_verify_email',
      key: email.toLowerCase(),
      limit: 15,
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

    try {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (user?.id) {
        await auditRepo.write({
          actorId: user.id,
          actorRole: null,
          action: 'PASSWORD_RESET_VERIFY_CODE',
          entityType: 'USER',
          entityId: user.id,
          metadata: { ip },
        });
      }
    } catch {}

    return NextResponse.json(
      { success: true, message: 'Xác thực thành công' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying code:', error);
    return errorResponse(500, 'Không thể xác thực mã');
  }
}