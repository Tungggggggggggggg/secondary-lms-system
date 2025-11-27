import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface StudentTeacherClassroomRow {
  classroom: {
    id: string;
    name: string;
    code: string;
    icon: string | null;
    teacher: {
      id: string;
      email: string;
      fullname: string | null;
    } | null;
  };
}

interface Teacher {
  id: string;
  email: string;
  fullname: string | null;
  classrooms: Array<{
    id: string;
    name: string;
    code: string;
    icon: string | null;
  }>;
}

/**
 * GET /api/students/teachers
 * Lấy danh sách giáo viên từ tất cả các lớp mà học sinh đã tham gia
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, "STUDENT");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Lấy tất cả các lớp học sinh đã tham gia
    const studentClassrooms = (await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      include: {
        classroom: {
          include: {
            teacher: {
              select: {
                id: true,
                email: true,
                fullname: true,
              },
            },
          },
        },
      },
    })) as StudentTeacherClassroomRow[];

    // Tạo map để loại bỏ giáo viên trùng lặp
    const teacherMap = new Map<
      string,
      {
        id: string;
        email: string;
        fullname: string | null;
        classrooms: Array<{
          id: string;
          name: string;
          code: string;
          icon: string | null;
        }>;
      }
    >();

    studentClassrooms.forEach((sc: StudentTeacherClassroomRow) => {
      const teacher = sc.classroom.teacher;
      if (teacher) {
        const existing = teacherMap.get(teacher.id);
        if (existing) {
          existing.classrooms.push({
            id: sc.classroom.id,
            name: sc.classroom.name,
            code: sc.classroom.code,
            icon: sc.classroom.icon,
          });
        } else {
          teacherMap.set(teacher.id, {
            id: teacher.id,
            email: teacher.email,
            fullname: teacher.fullname,
            classrooms: [
              {
                id: sc.classroom.id,
                name: sc.classroom.name,
                code: sc.classroom.code,
                icon: sc.classroom.icon,
              },
            ],
          });
        }
      }
    });

    const teachers = Array.from(teacherMap.values());

    return NextResponse.json({
      success: true,
      data: teachers,
    });
  } catch (error: unknown) {
    console.error("[GET /api/students/teachers] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

