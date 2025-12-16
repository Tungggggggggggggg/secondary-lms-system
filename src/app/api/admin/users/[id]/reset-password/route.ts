import { NextResponse } from "next/server";

/**
 * POST /api/admin/users/[id]/reset-password
 * Admin tạo mã reset password và gửi email cho user.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: true,
      message: "Endpoint đã bị gỡ bỏ",
      details: null,
    },
    { status: 410 }
  );
}
