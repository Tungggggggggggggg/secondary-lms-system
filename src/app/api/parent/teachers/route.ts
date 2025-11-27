import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

interface ParentTeacherClassroomRow {
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
  student: {
    id: string;
    fullname: string | null;
  };
}

/**
 * GET /api/parent/teachers
 * Lấy danh sách giáo viên từ tất cả các lớp mà con của phụ huynh đã tham gia
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, "PARENT");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Lấy danh sách tất cả con của phụ huynh
    const relationships = await prisma.parentStudent.findMany({
      where: {
        parentId: user.id,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
    });

    if (relationships.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const studentIds = relationships.map(
      (rel: { studentId: string }) => rel.studentId,
    );

    // Lấy tất cả các lớp mà các con đã tham gia
    const studentClassrooms = await prisma.classroomStudent.findMany({
      where: { studentId: { in: studentIds } },
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
        student: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
    });

    // Tạo map để nhóm theo giáo viên và học sinh
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
          students: Array<{
            id: string;
            fullname: string | null;
          }>;
        }>;
      }
    >();

    studentClassrooms.forEach((sc: ParentTeacherClassroomRow) => {
      const teacher = sc.classroom.teacher;
      if (teacher) {
        const existing = teacherMap.get(teacher.id);
        const student = sc.student;
        const classroom = {
          id: sc.classroom.id,
          name: sc.classroom.name,
          code: sc.classroom.code,
          icon: sc.classroom.icon,
          students: [{ id: student.id, fullname: student.fullname }],
        };

        if (existing) {
          // Kiểm tra xem lớp này đã có chưa
          const existingClassroom = existing.classrooms.find((c) => c.id === classroom.id);
          if (existingClassroom) {
            // Nếu lớp đã có, thêm học sinh vào danh sách (nếu chưa có)
            if (!existingClassroom.students.find((s) => s.id === student.id)) {
              existingClassroom.students.push({ id: student.id, fullname: student.fullname });
            }
          } else {
            existing.classrooms.push(classroom);
          }
        } else {
          teacherMap.set(teacher.id, {
            id: teacher.id,
            email: teacher.email,
            fullname: teacher.fullname,
            classrooms: [classroom],
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
    console.error("[GET /api/parent/teachers] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}

