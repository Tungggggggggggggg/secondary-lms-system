import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser, isTeacherOfAssignment, getRequestId } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "assignmentId is required", requestId },
        { status: 400 }
      );
    }

    // Quyền xem: giáo viên (tác giả) hoặc học sinh thuộc lớp có assignment này
    let canView = false;
    if (user.role === UserRole.TEACHER) {
      canView = await isTeacherOfAssignment(user.id, assignmentId);
    } else if (user.role === UserRole.STUDENT) {
      // Kiểm tra student có ở bất kỳ lớp nào chứa assignment này
      const ac = await prisma.assignmentClassroom.findFirst({
        where: { assignmentId, classroom: { students: { some: { studentId: user.id } } } },
        select: { id: true },
      });
      canView = !!ac;
    }

    if (!canView) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
        { status: 403 }
      );
    }

    const files = await prisma.assignmentFile.findMany({
      where: { assignmentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, path: true, size: true, mimeType: true, createdAt: true },
    });

    // Tạo signed URLs TTL 15 phút
    const entries = await Promise.all(
      files.map(async (f) => {
        const { data } = await supabaseAdmin.storage
          .from(process.env.SUPABASE_BUCKET || "assignments")
          .createSignedUrl(f.path, 900, { download: true, transform: undefined });
        return {
          id: f.id,
          name: f.name,
          size: f.size,
          mimeType: f.mimeType,
          createdAt: f.createdAt,
          url: data?.signedUrl || null,
        };
      })
    );

    return NextResponse.json(
      { success: true, data: entries, requestId },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [GET] /api/assignments/${params.id}/files {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


