import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { generateResetToken } from '@/lib/utils';

// Schema validate body request
const requestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

export async function POST(req: Request) {
  try {
    // Kiểm tra kết nối Prisma
    if (!prisma) {
      console.error('Prisma client is not initialized');
      return NextResponse.json(
        { error: 'Lỗi kết nối cơ sở dữ liệu' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email } = requestSchema.parse(body);

    console.log('Processing reset password request for email:', email);

    // Kiểm tra email có tồn tại
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true } // Chỉ lấy id để tối ưu
    });

    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { error: 'Email này chưa được đăng ký' },
        { status: 404 }
      );
    }

    console.log('User found, generating reset token...');

    // Tạo token reset (mã 6 số ngẫu nhiên)
    const token = generateResetToken();

    // Lưu thông tin reset vào database
    // Trước khi tạo mới, xóa các yêu cầu cũ chưa hoàn thành của email này
    await prisma.passwordReset.deleteMany({
      where: {
        email,
        completed: false,
      },
    });

    console.log('Deleted old reset requests');

    await prisma.passwordReset.create({
      data: {
        email,
        token,
        expires: new Date(Date.now() + 10 * 60 * 1000), // 10 phút
      },
    });

    // Gửi email chứa mã xác nhận
    await sendEmail({
      to: email,
      subject: '🔐 Mã xác nhận đặt lại mật khẩu',
      html: `
        <h2>Xin chào!</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Đây là mã xác nhận của bạn:</p>
        <div style="
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 8px;
        ">
          ${token}
        </div>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,</p>
        <p>Secondary LMS System</p>
      `,
    });

    return NextResponse.json(
      { message: 'Mã xác nhận đã được gửi thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dữ liệu không hợp lệ', 
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400 }
      );
    }

    console.error('Error sending reset code:', error);
    return NextResponse.json(
      { error: 'Không thể gửi mã xác nhận' },
      { status: 500 }
    );
  }
}