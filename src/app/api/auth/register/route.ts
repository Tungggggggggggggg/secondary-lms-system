import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { errorResponse } from '@/lib/api-utils';
import { passwordSchema } from '@/lib/validation/password.schema';

const ALLOWED_USER_ROLES = [
  'TEACHER',
  'STUDENT',
  'PARENT',
] as const;

type UserRole = (typeof ALLOWED_USER_ROLES)[number];

const registerSchema = z
  .object({
    fullname: z.string().min(1).max(200),
    email: z.string().email().max(320),
    password: passwordSchema,
    role: z.string().optional().nullable(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }

    const { fullname, email, password, role } = parsed.data;

    // 4. Kiểm tra người dùng đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse(409, 'Email đã được đăng ký.');
    }

    // 5. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

    // 6. Tạo người dùng mới trong cơ sở dữ liệu
    // KHÔNG truyền role = null để Prisma áp dụng default từ schema (STUDENT)
    const data: any = {
      fullname,
      email,
      password: hashedPassword,
    };

    // Nếu FE có gửi role hợp lệ thì set; nếu không bỏ qua để dùng default
    if (typeof role === 'string') {
      const upper = role.toUpperCase();
      if ((ALLOWED_USER_ROLES as readonly string[]).includes(upper)) {
        data.role = upper as UserRole;
      }
    }

    const newUser = await prisma.user.create({ data });

    // 7. Trả về thông báo thành công (không trả password)
    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      fullname: newUser.fullname,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
    return NextResponse.json({ message: 'Đăng ký thành công!', user: safeUser }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      console.error('[API Register] Unique constraint failed:', error.meta);
      return errorResponse(409, 'Email đã tồn tại.');
    }

    console.error('[API Register] Error:', error);
    return errorResponse(500, 'Đã xảy ra lỗi trong quá trình đăng ký.');
  }
}