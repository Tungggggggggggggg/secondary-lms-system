import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Chưa xác thực.' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Vui lòng điền đầy đủ thông tin.' },
        { status: 400 }
      );
    }

    // Check password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Người dùng không tồn tại.' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Mật khẩu hiện tại không đúng.' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: 'Đổi mật khẩu thành công!',
    });
  } catch (error) {
    console.error('[API Change Password] Error:', error);
    return NextResponse.json(
      { message: 'Có lỗi xảy ra khi đổi mật khẩu.' },
      { status: 500 }
    );
  }
}

