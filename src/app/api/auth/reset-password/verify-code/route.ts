import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

// Schema validate body request
const verifySchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  token: z.string().length(6, 'Mã xác nhận phải có 6 ký tự'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, token } = verifySchema.parse(body);

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

    return NextResponse.json(
      { message: 'Xác thực thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: 'Không thể xác thực mã' },
      { status: 500 }
    );
  }
}