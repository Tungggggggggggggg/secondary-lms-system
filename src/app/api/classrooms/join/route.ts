import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { ClassroomMember, Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Class code is required" },
        { status: 400 }
      );
    }

    // Tìm lớp học theo mã
    const classroom = await prisma.classroom.findUnique({
      where: { code },
      include: {
        members: true,
        _count: {
          select: {
            members: true
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
    const isMember = classroom.members.some(member => member.userId === session.user.id);
    if (isMember) {
      return NextResponse.json(
        { success: false, message: "Bạn đã là thành viên của lớp học này" },
        { status: 400 }
      );
    }

    // Kiểm tra số lượng học sinh tối đa
    if (classroom._count.members >= classroom.maxStudents) {
      return NextResponse.json(
        { success: false, message: "Lớp học đã đạt số lượng học sinh tối đa" },
        { status: 400 }
      );
    }

    // Thêm học sinh vào lớp
    const member = await prisma.classroomMember.create({
      data: {
        classroomId: classroom.id,
        userId: session.user.id,
        role: session.user.role
      }
    });

    return NextResponse.json({
      success: true,
      message: "Tham gia lớp học thành công",
      member
    });

  } catch (error) {
    console.error("[CLASSROOM_JOIN]", error);
    return NextResponse.json(
      { success: false, message: "Internal Error" },
      { status: 500 }
    );
  }
}