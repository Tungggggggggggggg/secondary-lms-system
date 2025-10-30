import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { UserRole, Prisma } from '@prisma/client';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Chưa xác thực.' }, { status: 401 });
    }

    const body = await req.json();
    const { role } = body as { role?: string };

    if (!role) {
      return NextResponse.json({ message: 'Vui lòng cung cấp vai trò.' }, { status: 400 });
    }

    // Chuẩn hóa role (client có thể gửi lowercase)
    const normalized = role.trim().toUpperCase();
    if (!Object.values(UserRole).includes(normalized as UserRole)) {
      console.error('[API Update Role] Invalid role value:', role);
      return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
    }

    // Cập nhật vai trò của người dùng trong cơ sở dữ liệu
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role: normalized as UserRole },
      // Chỉ chọn các trường hiện có trong schema Prisma tối giản
      select: { id: true, email: true, fullname: true, role: true, createdAt: true, updatedAt: true },
    });

    // Trả về thông tin người dùng đã cập nhật
    return NextResponse.json({ message: 'Cập nhật vai trò thành công!', user: updatedUser }, { status: 200 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[API Update Role] Prisma known error:', error.code, error.message, error.meta);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[API Update Role] Prisma validation error:', error.message);
    } else if (error instanceof Error) {
      console.error('[API Update Role] Unexpected error:', error.message, error.stack);
    } else {
      console.error('[API Update Role] Unknown error:', error);
    }
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi cập nhật vai trò.' }, { status: 500 });
  }
}