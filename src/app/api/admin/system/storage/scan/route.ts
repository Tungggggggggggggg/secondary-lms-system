import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, withApiLogging, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// GET /api/admin/system/storage/scan
// Quét các bản ghi orphan logic (ở DB):
//  - assignment_files: assignmentId không tồn tại
//  - announcement_attachments: announcementId không tồn tại
//  - submission_files: submissionId không tồn tại
export const GET = withApiLogging(async (req: NextRequest) => {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) return errorResponse(401, "Unauthorized");
  if (authUser.role !== "SUPER_ADMIN") return errorResponse(403, "Forbidden: SUPER_ADMIN only");

  // Orphan = id tham chiếu không tồn tại; Prisma không hỗ trợ join anti trực tiếp -> dùng NOT EXISTS qua counts
  const [assignmentFiles, announcementAttachments, submissionFiles] = await Promise.all([
    prisma.assignmentFile.findMany({
      where: { assignment: { is: null as any } },
      select: { id: true, path: true, name: true },
    }).catch(() => [] as any[]),
    prisma.announcementAttachment.findMany({
      where: { announcement: { is: null as any } },
      select: { id: true, path: true, name: true },
    }).catch(() => [] as any[]),
    prisma.submissionFile.findMany({
      where: { submission: { is: null as any } },
      select: { id: true, storagePath: true, fileName: true },
    }).catch(() => [] as any[]),
  ]);

  return NextResponse.json({ success: true, assignmentFiles, announcementAttachments, submissionFiles });
}, "ADMIN_SYSTEM_STORAGE_SCAN");


