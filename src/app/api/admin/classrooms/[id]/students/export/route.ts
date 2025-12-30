import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { errorResponse } from "@/lib/api-utils";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    return NextResponse.json(
      {
        success: false,
        message: "Excel export đã bị loại bỏ khỏi hệ thống.",
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students/export GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
