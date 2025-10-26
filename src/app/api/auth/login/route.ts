import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return NextResponse.json({ message: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    // 2. Tìm người dùng theo email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    // 3. So sánh mật khẩu đã nhập với mật khẩu đã mã hóa trong DB
    const isPasswordValid = await bcrypt.compare(password, user.password || '');

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Email hoặc mật khẩu không đúng.' }, { status: 401 });
    }

    // 4. Đăng nhập thành công (có thể tạo session/JWT ở đây nếu không dùng NextAuth)
    // Hiện tại, chỉ trả về thông tin user cơ bản (không bao gồm mật khẩu)
    const { password: _, ...userWithoutPassword } = user; // Loại bỏ trường password

    return NextResponse.json({ message: 'Đăng nhập thành công!', user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('API Login Error:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi trong quá trình đăng nhập.' }, { status: 500 });
  }
}