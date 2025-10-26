import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

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
    const body = await req.json();
    const { email, token, password } = resetSchema.parse(body);

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
      return NextResponse.json(
        { error: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' },
        { status: 400 }
      );
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

    return NextResponse.json(
      { message: 'Đặt lại mật khẩu thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dữ liệu không hợp lệ', 
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        },
        { status: 400 }
      );
    }

    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Không thể đặt lại mật khẩu' },
      { status: 500 }
    );
  }
}