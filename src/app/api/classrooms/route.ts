
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { generateClassroomCode } from "@/lib/utils";
import { Prisma, UserRole } from "@prisma/client";

// Handler GET: Lấy danh sách lớp học cho giáo viên hiện tại
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    // Chỉ lấy lớp học của giáo viên
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });
    if (!user || user.role !== UserRole.TEACHER) {
      // Nếu người dùng đã xác thực nhưng không phải teacher, trả về mảng rỗng
      // (frontend sẽ xử lý hiển thị phù hợp). Ghi log chi tiết để dễ debug.
      console.warn(`[WARN] [GET] User ${user?.id ?? 'unknown'} with role=${user?.role ?? 'unknown'} tried to access teacher classrooms`);
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }
    // Lấy danh sách lớp học
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: user.id },
      include: {
        _count: { select: { students: true } },
      },
    });
    // Log
    console.log(`[INFO] [GET] Lấy danh sách lớp học cho teacher: ${user.id}`);
    return NextResponse.json({ success: true, data: classrooms }, { status: 200 });
  } catch (error) {
    console.error("[ERROR] [GET] Lỗi lấy danh sách lớp học:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    if (!user || user.role !== UserRole.TEACHER) {
      return NextResponse.json(
        { success: false, message: "Forbidden - Teacher role required" },
        { status: 403 }
      );
    }

    // Lấy dữ liệu từ request
    const data = await req.json();
    const { name, description, icon, maxStudents, code: providedCode } = data as {
      name?: string;
      description?: string;
      icon?: string;
      maxStudents?: number;
      code?: string;
    };

    // Validate dữ liệu
    if (!name || !icon || !maxStudents) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Chọn mã lớp học: ưu tiên mã do client cung cấp (nếu hợp lệ, không trùng), nếu không sẽ tự sinh
    let code = (providedCode ?? "").trim().toUpperCase();
    if (code) {
      const validPattern = /^[A-Z2-9]{4,10}$/; // giống form phía client: loại bỏ ký tự dễ nhầm, độ dài hợp lý
      if (!validPattern.test(code)) {
        return NextResponse.json({ success: false, message: "Mã lớp không hợp lệ" }, { status: 400 });
      }
      const exists = await prisma.classroom.findUnique({ where: { code } });
      if (exists) {
        return NextResponse.json({ success: false, message: "Mã lớp đã tồn tại, vui lòng chọn mã khác" }, { status: 409 });
      }
    } else {
      // Tự động sinh mã không trùng
      // Thử tối đa 5 lần để tránh vòng lặp hiếm gặp
      for (let i = 0; i < 5; i++) {
        const candidate = generateClassroomCode();
        const exists = await prisma.classroom.findUnique({ where: { code: candidate } });
        if (!exists) { code = candidate; break; }
      }
      if (!code) {
        console.error("[ERROR] Không thể sinh mã lớp học duy nhất sau nhiều lần thử");
        return NextResponse.json({ success: false, message: "Không thể tạo mã lớp học, vui lòng thử lại" }, { status: 500 });
      }
    }

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
  } catch (error) {
    // Log lỗi có phân loại Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[ERROR][CLASSROOMS POST] Prisma known error:', error.code, error.message, error.meta);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('[ERROR][CLASSROOMS POST] Prisma validation error:', error.message);
    } else if (error instanceof Error) {
      console.error('[ERROR][CLASSROOMS POST] Unexpected error:', error.message, error.stack);
    } else {
      console.error('[ERROR][CLASSROOMS POST] Unknown error:', error);
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}