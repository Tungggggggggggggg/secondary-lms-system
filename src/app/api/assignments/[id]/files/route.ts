import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthenticatedUser, isTeacherOfAssignment, getRequestId } from "@/lib/api-utils";

const BUCKET =
  process.env.SUPABASE_ASSIGNMENTS_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const admin = supabaseAdmin;
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Storage client not initialized", requestId },
        { status: 500 }
      );
    }
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
    if (user.role === "TEACHER") {
      canView = await isTeacherOfAssignment(user.id, assignmentId);
    } else if (user.role === "STUDENT") {
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
      where: { assignmentId, file_type: 'ATTACHMENT' },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, path: true, size: true, mimeType: true, createdAt: true },
    });

    interface AssignmentFileRow {
      id: string;
      name: string;
      path: string;
      size: number;
      mimeType: string | null;
      createdAt: Date | string;
    }

    // Tạo signed URLs TTL 15 phút
    const entries = await Promise.all(
      files.map(async (f: AssignmentFileRow) => {
        const { data } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(f.path, 900, { download: true, transform: undefined });
        return {
          id: f.id,
          name: f.name,
          path: f.path,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  try {
    const admin = supabaseAdmin;
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Storage client not initialized", requestId },
        { status: 500 }
      );
    }

    const user = await getAuthenticatedUser(req, "TEACHER");
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!assignmentId || !fileId) {
      return NextResponse.json(
        { success: false, message: "assignmentId and fileId are required", requestId },
        { status: 400 }
      );
    }

    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, message: "Forbidden", requestId },
        { status: 403 }
      );
    }

    const file = await prisma.assignmentFile.findFirst({
      where: { id: fileId, assignmentId, file_type: 'ATTACHMENT' },
      select: { id: true, path: true }
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File not found", requestId },
        { status: 404 }
      );
    }

    // Xóa khỏi storage trước
    const { error: storageErr } = await admin.storage
      .from(BUCKET)
      .remove([file.path]);

    if (storageErr) {
      console.error(`[ERROR] [DELETE] /api/assignments/${assignmentId}/files - Storage remove failed {requestId:${requestId}}`, storageErr);
      return NextResponse.json(
        { success: false, message: "Failed to delete file from storage", requestId },
        { status: 500 }
      );
    }

    // Xóa metadata DB
    await prisma.assignmentFile.delete({ where: { id: file.id } });

    return NextResponse.json(
      { success: true, message: "File deleted", requestId },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[ERROR] [DELETE] /api/assignments/${params.id}/files {requestId:${requestId}}`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error", requestId },
      { status: 500 }
    );
  }
}


