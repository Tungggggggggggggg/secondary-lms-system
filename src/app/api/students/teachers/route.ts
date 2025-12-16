import { NextRequest, NextResponse } from "next/server";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface StudentTeacherClassroomRow {
  classroom: {
    id: string;
    name: string;
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
    icon: string | null;
  }>;
}

/**
 * GET /api/students/teachers
 * Lấy danh sách giáo viên từ tất cả các lớp mà học sinh đã tham gia
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

    // Lấy tất cả các lớp học sinh đã tham gia
    const studentClassrooms = (await prisma.classroomStudent.findMany({
      where: { studentId: user.id },
      select: {
        classroom: {
          select: {
            id: true,
            name: true,
            icon: true,
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
    return errorResponse(500, "Internal server error");
  }
}

