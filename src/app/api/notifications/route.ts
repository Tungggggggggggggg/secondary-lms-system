import { NextResponse } from "next/server";

export async function GET() {
  // Trả về danh sách thông báo rỗng để UI hoạt động, tránh 501
  // Cấu trúc linh hoạt tương thích NotificationBell: ưu tiên data hoặc items
  return NextResponse.json({ data: [], items: [], unread: 0 }, { status: 200 });
}

