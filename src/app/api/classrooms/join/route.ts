import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Kiểm tra role phải là học sinh
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });
    if (!user || user.role !== "STUDENT") {

      return NextResponse.json(
        { success: false, message: "Chỉ học sinh mới có thể tham gia lớp học" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Mã lớp học không được để trống" },
        { status: 400 }
      );
    }

    // Tìm lớp học theo mã
    const classroom = await prisma.classroom.findUnique({
      where: { code },
      include: {
        students: true,
        _count: {
          select: {
            students: true
          }
        }
      }
    });

    if (!classroom) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy lớp học với mã này" },
        { status: 404 }
      );
    }

    // Kiểm tra xem đã là thành viên chưa
    const isMember = classroom.students.some(
      (student: { studentId: string }) => student.studentId === user.id,
    );
    if (isMember) {
      return NextResponse.json(
        { success: false, message: "Bạn đã là thành viên của lớp học này" },
        { status: 400 }
      );
    }

    // Kiểm tra số lượng học sinh tối đa
    if (classroom._count.students >= classroom.maxStudents) {
      return NextResponse.json(
        { success: false, message: "Lớp học đã đạt số lượng học sinh tối đa" },
        { status: 400 }
      );
    }

    // Thêm học sinh vào lớp
    const classroomStudent = await prisma.classroomStudent.create({
      data: {
        classroomId: classroom.id,
        studentId: user.id
      },
      include: {
        classroom: {
          include: {
            teacher: { select: { id: true, fullname: true, email: true } },
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Tham gia lớp học thành công",
      data: classroomStudent
    });

  } catch (error) {
    console.error("[CLASSROOM_JOIN]", error);
    return NextResponse.json(
      { success: false, message: "Internal Error" },
      { status: 500 }
    );
  }
}