import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { fullname, email, password } = await req.json();

    // 1. Kiểm tra dữ liệu đầu vào
    if (!fullname) {
      return NextResponse.json({ message: 'Vui lòng nhập họ và tên.' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ message: 'Vui lòng nhập địa chỉ email.' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ message: 'Vui lòng nhập mật khẩu.' }, { status: 400 });
    }

    // 2. Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Email không hợp lệ.' }, { status: 400 });
    }

    // 3. Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
      return NextResponse.json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' }, { status: 400 });
    }

    // 4. Kiểm tra người dùng đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Email đã được đăng ký.' }, { status: 409 });
    }

    // 5. Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds = 10

    // 6. Tạo người dùng mới trong cơ sở dữ liệu
    const newUser = await prisma.user.create({
      data: {
        fullname,
        email,
        password: hashedPassword,
        role: null, // Vai trò sẽ được chọn sau
      },
    });

    // 7. Trả về thông báo thành công
    return NextResponse.json({ message: 'Đăng ký thành công!', user: newUser }, { status: 201 });
  } catch (error) {
    // Log lỗi chi tiết để debug
    console.error('API Register Error:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi trong quá trình đăng ký.' }, { status: 500 });
  }
}