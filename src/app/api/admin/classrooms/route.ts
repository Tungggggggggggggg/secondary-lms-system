import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-utils";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { generateClassroomCode } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim().toLowerCase();

    const where: any = {};

    if (status === "active") where.isActive = true;
    if (status === "archived") where.isActive = false;

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { code: { contains: q, mode: "insensitive" as const } },
        { teacher: { is: { fullname: { contains: q, mode: "insensitive" as const } } } },
        { teacher: { is: { email: { contains: q, mode: "insensitive" as const } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.classroom.count({ where }),
      prisma.classroom.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          code: true,
          icon: true,
          maxStudents: true,
          isActive: true,
          createdAt: true,
          teacher: { select: { id: true, fullname: true, email: true } },
          _count: { select: { students: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        pageSize,
        total,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

const createSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    icon: z.string().max(50).optional().nullable(),
    maxStudents: z.number().int().min(1).max(500).optional().default(30),
    code: z.string().max(20).optional().nullable(),
    teacherId: z.string().optional().nullable(),
    teacherEmail: z.string().email().optional().nullable(),
  })
  .refine((v) => !!(v.teacherId || v.teacherEmail), {
    message: "teacherId hoặc teacherEmail là bắt buộc",
    path: ["teacherId"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const name = parsed.data.name.trim();
    const description = parsed.data.description?.toString().trim() || null;
    const icon = parsed.data.icon?.toString().trim() || "📚";
    const maxStudents = parsed.data.maxStudents;

    const teacher = await prisma.user.findFirst({
      where: {
        ...(parsed.data.teacherId ? { id: parsed.data.teacherId } : {}),
        ...(parsed.data.teacherEmail ? { email: parsed.data.teacherEmail.toLowerCase() } : {}),
        role: "TEACHER",
      },
      select: { id: true, email: true, fullname: true },
    });

    if (!teacher) {
      return errorResponse(400, "Teacher không hợp lệ");
    }

    let code = (parsed.data.code ?? "").toString().trim().toUpperCase();
    if (code) {
      const validPattern = /^[A-Z2-9]{4,10}$/;
      if (!validPattern.test(code)) {
        return errorResponse(400, "Mã lớp không hợp lệ");
      }
      const exists = await prisma.classroom.findUnique({ where: { code } });
      if (exists) {
        return errorResponse(409, "Mã lớp đã tồn tại, vui lòng chọn mã khác");
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const candidate = generateClassroomCode();
        const exists = await prisma.classroom.findUnique({ where: { code: candidate } });
        if (!exists) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        return errorResponse(500, "Không thể tạo mã lớp học, vui lòng thử lại");
      }
    }

    const created = await prisma.classroom.create({
      data: {
        name,
        description,
        code,
        icon,
        maxStudents,
        teacherId: teacher.id,
      },
      select: {
        id: true,
        name: true,
        code: true,
        icon: true,
        maxStudents: true,
        isActive: true,
        createdAt: true,
        teacher: { select: { id: true, fullname: true, email: true } },
        _count: { select: { students: true } },
      },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_CREATE",
        entityType: "CLASSROOM",
        entityId: created.id,
        metadata: {
          classroomCode: created.code,
          classroomName: created.name,
          teacherId: teacher.id,
          teacherEmail: teacher.email,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms POST] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
