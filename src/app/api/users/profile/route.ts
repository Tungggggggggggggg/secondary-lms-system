import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Chưa xác thực.' }, { status: 401 });
    }

    const body = await req.json();
    const { fullname, email } = body as {
      fullname?: string;
      email?: string;
    };

    // Validate input
    if (!fullname && !email) {
      return NextResponse.json({ message: 'Vui lòng cung cấp thông tin cần cập nhật.' }, { status: 400 });
    }

    // If email is being updated, check if it's already taken by another user
    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ message: 'Email đã được sử dụng.' }, { status: 409 });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(fullname && { fullname }),
        ...(email && { email }),
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin thành công!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('[API Update Profile] Error:', error);
    return NextResponse.json(
      { message: 'Có lỗi xảy ra khi cập nhật thông tin.' },
      { status: 500 }
    );
  }
}

