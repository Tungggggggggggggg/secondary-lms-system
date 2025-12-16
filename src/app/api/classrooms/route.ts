import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateClassroomCode } from "@/lib/utils";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

const postSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    icon: z.string().min(1).max(100),
    maxStudents: z.coerce.number().int().min(1).max(10_000),
    code: z.string().optional(),
  })
  .strict();

interface StudentClassroomRow {
  joinedAt: Date;
  classroom: {
    id: string;
    name: string;
    description: string | null;
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
    if (!user) return errorResponse(401, "Unauthorized");

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
      return NextResponse.json({ success: true, data: classrooms }, { status: 200 });
    }

    return errorResponse(403, "Forbidden");
  } catch (error: unknown) {
    console.error("[ERROR] [GET] Lỗi lấy danh sách lớp học:", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = postSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { name, description, icon, maxStudents, code: providedCode } = parsedBody.data;

    // Chọn mã lớp học: ưu tiên mã do client cung cấp (nếu hợp lệ, không trùng), nếu không sẽ tự sinh
    let code = (providedCode ?? "").trim().toUpperCase();
    if (code) {
      const validPattern = /^[A-Z2-9]{4,10}$/; // giống form phía client: loại bỏ ký tự dễ nhầm, độ dài hợp lý
      if (!validPattern.test(code)) {
        return errorResponse(400, "Mã lớp không hợp lệ");
      }
      const exists = await prisma.classroom.findUnique({ where: { code } });
      if (exists) {
        return errorResponse(409, "Mã lớp đã tồn tại, vui lòng chọn mã khác");
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
        return errorResponse(500, "Không thể tạo mã lớp học, vui lòng thử lại");
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

    return NextResponse.json(
      {
        success: true,
        message: "Tạo lớp học thành công",
        data: classroom,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      console.error("[ERROR][CLASSROOMS POST] Unique constraint error:", (error as { meta?: unknown }).meta);
    } else {
      console.error("[ERROR][CLASSROOMS POST] Unexpected error:", error);
    }
    return errorResponse(500, "Internal server error");
  }
}