import { NextResponse } from "next/server";

// GET /api/grades/export
// Placeholder: Chưa triển khai, trả về 501 để tránh lỗi khi build
export async function GET() {
  try {
    return NextResponse.json(
      { success: false, message: "Not implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("[GET /api/grades/export] Lỗi:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

