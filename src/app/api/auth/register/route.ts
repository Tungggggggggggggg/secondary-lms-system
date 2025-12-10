import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const ALLOWED_USER_ROLES = [
  'TEACHER',
  'STUDENT',
  'PARENT',
] as const;

type UserRole = (typeof ALLOWED_USER_ROLES)[number];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullname, email, password, role } = body as {
      fullname?: string;
      email?: string;
      password?: string;
      role?: string | null;
    };

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
    // Log lỗi chi tiết để debug và phân loại lỗi unique constraint nếu có
    if (typeof error === 'object' && error && (error as any).code === 'P2002') {
      console.error('[API Register] Unique constraint failed:', (error as any).meta);
      return NextResponse.json({ message: 'Email đã tồn tại.' }, { status: 409 });
    }

    if (error instanceof Error) {
      console.error('[API Register] Unexpected error:', error.message, error.stack);
    } else {
      console.error('[API Register] Unknown error:', error);
    }

    return NextResponse.json({ message: 'Đã xảy ra lỗi trong quá trình đăng ký.' }, { status: 500 });
  }
}