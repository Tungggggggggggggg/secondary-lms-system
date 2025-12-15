import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAudit } from '@/lib/logging/audit';
import { z } from 'zod';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { notificationRepo } from '@/lib/repositories/notification-repo';

const ALLOWED_USER_ROLES = [
  'TEACHER',
  'STUDENT',
  'PARENT',
] as const;

type UserRoleString = (typeof ALLOWED_USER_ROLES)[number];

const requestSchema = z.object({
  role: z.string().min(1, 'Vui lòng cung cấp vai trò.'),
});

export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, 'Chưa xác thực.');

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, 'Dữ liệu không hợp lệ', {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const { role } = parsed.data;

    // Chuẩn hóa role (client có thể gửi lowercase)
    const normalized = role.trim().toUpperCase();
    
    if (!(ALLOWED_USER_ROLES as readonly string[]).includes(normalized)) {
      return errorResponse(400, 'Vai trò không hợp lệ.');
    }

    // Chỉ cho phép tự đổi giữa các vai trò không đặc quyền
    const selfAssignable: UserRoleString[] = ['TEACHER', 'STUDENT', 'PARENT'];
    if (!selfAssignable.includes(normalized as UserRoleString)) {
      return errorResponse(403, 'Không được phép tự thay đổi sang vai trò đặc quyền.');
    }

    // Cập nhật vai trò của người dùng trong cơ sở dữ liệu
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: normalized as UserRoleString, roleSelectedAt: new Date() },
      // Chỉ chọn các trường hiện có trong schema Prisma tối giản
      select: { id: true, email: true, fullname: true, role: true, roleSelectedAt: true, createdAt: true, updatedAt: true },
    });

    try {
      await notificationRepo.add(user.id, {
        title: 'Cập nhật vai trò thành công',
        description: `Bạn đã chọn vai trò ${updatedUser.role}.`,
      });
    } catch (e) {
      console.error('[API Update Role] Failed to create notification', e);
    }

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
    return NextResponse.json({ success: true, message: 'Cập nhật vai trò thành công!', user: updatedUser }, { status: 200 });
  } catch (error: unknown) {
    console.error('[API Update Role] Error:', error);
    return errorResponse(500, 'Đã xảy ra lỗi khi cập nhật vai trò.');
  }
}