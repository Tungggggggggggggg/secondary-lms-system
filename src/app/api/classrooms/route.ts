import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { generateClassroomCode } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    // Kiểm tra xác thực
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Kiểm tra role teacher
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });
    if (!user || user.role !== "teacher") {
      return NextResponse.json(
        { success: false, message: "Forbidden - Teacher role required" },
        { status: 403 }
      );
    }

    // Lấy dữ liệu từ request
    const data = await req.json();
    const { name, description, icon, maxStudents } = data;

    // Validate dữ liệu
    if (!name || !icon || !maxStudents) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Tạo mã lớp học ngẫu nhiên
    const code = generateClassroomCode();

    // Tạo lớp học mới
    const classroom = await prisma.classroom.create({
      data: {
        name,
        description,
        code,
        icon,
        maxStudents,
        teacherId: user.id,
      },
      include: {
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    // Log thành công
    console.log(`[INFO] Created new classroom: ${classroom.id} by teacher: ${user.id}`);

    return NextResponse.json(
      {
        success: true,
        message: "Tạo lớp học thành công",
        data: classroom,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Log lỗi
    console.error("[ERROR] Failed to create classroom:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}