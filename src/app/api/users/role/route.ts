import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/logging/audit';

const ALLOWED_USER_ROLES = [
  'TEACHER',
  'STUDENT',
  'PARENT',
] as const;

type UserRoleString = (typeof ALLOWED_USER_ROLES)[number];

export async function PUT(req: Request) {
  try {
    console.log('[API Update Role] Request received');
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.warn('[API Update Role] Unauthorized - No session or user ID');
      return NextResponse.json({ message: 'Chưa xác thực.' }, { status: 401 });
    }

    console.log('[API Update Role] User authenticated', { userId: session.user.id, currentRole: session.user.role });

    const body = await req.json();
    const { role } = body as { role?: string };

    if (!role) {
      console.warn('[API Update Role] No role provided in request body');
      return NextResponse.json({ message: 'Vui lòng cung cấp vai trò.' }, { status: 400 });
    }

    // Chuẩn hóa role (client có thể gửi lowercase)
    const normalized = role.trim().toUpperCase();
    console.log('[API Update Role] Role normalization', { original: role, normalized });
    
    if (!(ALLOWED_USER_ROLES as readonly string[]).includes(normalized)) {
      console.error('[API Update Role] Invalid role value:', role);
      return NextResponse.json({ message: 'Vai trò không hợp lệ.' }, { status: 400 });
    }

    // Chỉ cho phép tự đổi giữa các vai trò không đặc quyền
    const selfAssignable: UserRoleString[] = ['TEACHER', 'STUDENT', 'PARENT'];
    if (!selfAssignable.includes(normalized as UserRoleString)) {
      console.warn('[API Update Role] Self-escalation attempt blocked', { userId: session.user.id, requestedRole: normalized });
      return NextResponse.json({ message: 'Không được phép tự thay đổi sang vai trò đặc quyền.' }, { status: 403 });
    }

    // Cập nhật vai trò của người dùng trong cơ sở dữ liệu
    console.log('[API Update Role] Updating user role in database', { userId: session.user.id, newRole: normalized });
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role: normalized as UserRoleString },
      // Chỉ chọn các trường hiện có trong schema Prisma tối giản
      select: { id: true, email: true, fullname: true, role: true, createdAt: true, updatedAt: true },
    });

    try {
      await writeAudit({
        actorId: updatedUser.id,
        action: 'USER_ROLE_CHANGE',
        entityType: 'USER',
        entityId: updatedUser.id,
        metadata: { newRole: updatedUser.role },
      });
    } catch (e) {
      console.error('[API Update Role] Failed to write audit log', e);
    }

    // Trả về thông tin người dùng đã cập nhật
    return NextResponse.json({ message: 'Cập nhật vai trò thành công!', user: updatedUser }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('[API Update Role] Unexpected error:', error.message, error.stack);
    } else {
      console.error('[API Update Role] Unknown error:', error);
    }
    return NextResponse.json({ message: 'Đã xảy ra lỗi khi cập nhật vai trò.' }, { status: 500 });
  }
}