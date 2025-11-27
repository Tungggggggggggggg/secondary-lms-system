import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateClassroomCode } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/api-utils";

interface StudentClassroomRow {
  joinedAt: Date;
  classroom: {
    id: string;
    name: string;
    description: string | null;
    code: string;
    icon: string;
    maxStudents: number;
    teacherId: string;
    createdAt: Date;
    updatedAt: Date;
    teacher: {
      id: string;
      fullname: string | null;
      email: string;
    };
    _count: {
      students: number;
    };
  };
}

// Handler GET: Lấy danh sách lớp học cho giáo viên hoặc học sinh hiện tại
export async function GET(req: NextRequest) {
  try {
    // Sử dụng getAuthenticatedUser (không yêu cầu role cụ thể)
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Nếu là giáo viên: trả về lớp học do giáo viên tạo
    if (user.role === "TEACHER") {
      // OPTIMIZE: Sử dụng index [teacherId] đã có sẵn
      const classrooms = await prisma.classroom.findMany({
        where: { teacherId: user.id },
        select: {
          id: true,
          name: true,
          description: true,
          code: true,
          icon: true,
          maxStudents: true,
          teacherId: true,
          createdAt: true,
          updatedAt: true,
          // OPTIMIZE: _count được giữ lại vì cần thiết, nhưng có thể optimize sau nếu chậm
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: 'desc' }, // Sắp xếp để consistent ordering
      });
      console.log(`[INFO] [GET] Lấy danh sách lớp học cho teacher: ${user.id}`);
      return NextResponse.json({ success: true, data: classrooms }, { status: 200 });
    }

    // Nếu là học sinh: trả về lớp học mà học sinh đã tham gia
    if (user.role === "STUDENT") {
      // OPTIMIZE: Sử dụng composite index [studentId, joinedAt] cho query sắp xếp
      const studentClassrooms = (await prisma.classroomStudent.findMany({
        where: { studentId: user.id },
        select: {
          joinedAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              description: true,
              code: true,
              icon: true,
              maxStudents: true,
              teacherId: true,
              createdAt: true,
              updatedAt: true,
              teacher: { select: { id: true, fullname: true, email: true } },
              // OPTIMIZE: _count được giữ lại vì cần thiết, nhưng có thể optimize sau nếu chậm
              _count: { select: { students: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' }, // Sử dụng composite index [studentId, joinedAt]
      })) as StudentClassroomRow[];
      const classrooms = studentClassrooms.map((sc: StudentClassroomRow) => ({
        ...sc.classroom,
        joinedAt: sc.joinedAt, // Thông tin thời gian tham gia
      }));
      console.log(`[INFO] [GET] Lấy danh sách lớp học cho student: ${user.id}`);
      return NextResponse.json({ success: true, data: classrooms }, { status: 200 });
    }

    // Các role khác trả về rỗng
    console.warn(`[WARN] [GET] User ${user.id} with role=${user.role} tried to access classrooms`);
    return NextResponse.json({ success: true, data: [] }, { status: 200 });
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
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
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
  } catch (error: unknown) {
    // Log lỗi, ưu tiên bắt lỗi unique constraint nếu có
    if (typeof error === "object" && error && (error as any).code === "P2002") {
      console.error("[ERROR][CLASSROOMS POST] Unique constraint error:", (error as any).meta);
    } else if (error instanceof Error) {
      console.error("[ERROR][CLASSROOMS POST] Unexpected error:", error.message, error.stack);
    } else {
      console.error("[ERROR][CLASSROOMS POST] Unknown error:", error);
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}