import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { errorResponse } from '@/lib/api-utils';
import { passwordSchema } from '@/lib/validation/password.schema';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return errorResponse(401, 'Chưa xác thực.');
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    // Validate input
    if (!currentPassword || !newPassword) {
      return errorResponse(400, 'Vui lòng điền đầy đủ thông tin.');
    }

    const newPasswordParsed = passwordSchema.safeParse(newPassword);
    if (!newPasswordParsed.success) {
      return errorResponse(400, 'Mật khẩu không hợp lệ.', {
        details: newPasswordParsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return errorResponse(404, 'Người dùng không tồn tại.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return errorResponse(401, 'Mật khẩu hiện tại không đúng.');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công!' }, { status: 200 });
  } catch (error) {
    console.error('[API Change Password] Error:', error);
    return errorResponse(500, 'Có lỗi xảy ra khi đổi mật khẩu.');
  }
}

