import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment, getRequestId } from "@/lib/api-utils";

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
      return errorResponse(500, "Storage client not initialized", { requestId });
    }
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Unauthorized", { requestId });
    }

    const assignmentId = params.id;
    if (!assignmentId) {
      return errorResponse(400, "assignmentId is required", { requestId });
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
      return errorResponse(403, "Forbidden", { requestId });
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
  } catch (error: unknown) {
    console.error(
      `[ERROR] [GET] /api/assignments/${params.id}/files {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
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
      return errorResponse(500, "Storage client not initialized", { requestId });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized", { requestId });
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden", { requestId });

    const assignmentId = params.id;
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!assignmentId || !fileId) {
      return errorResponse(400, "assignmentId and fileId are required", { requestId });
    }

    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) {
      return errorResponse(403, "Forbidden", { requestId });
    }

    const file = await prisma.assignmentFile.findFirst({
      where: { id: fileId, assignmentId, file_type: 'ATTACHMENT' },
      select: { id: true, path: true }
    });

    if (!file) {
      return errorResponse(404, "File not found", { requestId });
    }

    // Xóa khỏi storage trước
    const { error: storageErr } = await admin.storage
      .from(BUCKET)
      .remove([file.path]);

    if (storageErr) {
      console.error(`[ERROR] [DELETE] /api/assignments/${assignmentId}/files - Storage remove failed {requestId:${requestId}}`, storageErr);
      return errorResponse(500, "Failed to delete file from storage", { requestId });
    }

    // Xóa metadata DB
    await prisma.assignmentFile.delete({ where: { id: file.id } });

    return NextResponse.json(
      { success: true, message: "File deleted", requestId },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `[ERROR] [DELETE] /api/assignments/${params.id}/files {requestId:${requestId}}`,
      error
    );
    return errorResponse(500, "Internal server error", { requestId });
  }
}


