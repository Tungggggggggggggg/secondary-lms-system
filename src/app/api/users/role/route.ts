import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Chưa xác thực.' }, { status: 401 });
    }

    const { role } = await req.json();

    if (!role) {
      return NextResponse.json({ message: 'Vui lòng cung cấp vai trò.' }, { status: 400 });
    }

    // Cập nhật vai trò của người dùng trong cơ sở dữ liệu
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role },
      // Chỉ chọn các trường hiện có trong schema Prisma tối giản
      select: { id: true, email: true, fullname: true, role: true, createdAt: true, updatedAt: true },
    });

    // Trả về thông tin người dùng đã cập nhật
    return NextResponse.json({ message: 'Cập nhật vai trò thành công!', user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('API Update Role Error:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi cập nhật vai trò.' }, { status: 500 });
  }
}