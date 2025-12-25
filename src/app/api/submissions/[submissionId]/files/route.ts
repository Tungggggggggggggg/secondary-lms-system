import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";
import { supabaseAdmin } from "@/lib/supabase";

interface SubmissionFileRow {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string;
  createdAt: Date;
}

interface SubmissionWithFilesRow {
  id: string;
  assignmentId: string;
  studentId: string;
  files: SubmissionFileRow[];
}

const BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "lms-submissions";

export async function GET(
  req: NextRequest,
  { params }: { params: { submissionId: string } },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const submission = (await prisma.submission.findUnique({
      where: { id: params.submissionId },
      select: {
        id: true,
        assignmentId: true,
        studentId: true,
        files: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sizeBytes: true,
            storagePath: true,
            createdAt: true,
          },
        },
      },
    })) as SubmissionWithFilesRow | null;

    if (!submission) {
      return errorResponse(404, "Submission not found");
    }

    // Authorization: teacher must own the assignment
    const ok = await isTeacherOfAssignment(user.id, submission.assignmentId);
    if (!ok) {
      return errorResponse(403, "Forbidden");
    }

    // Create short-lived signed URLs
    if (!supabaseAdmin) {
      return errorResponse(500, "Supabase admin client is not available");
    }

    const admin = supabaseAdmin;
    const files = await Promise.all(
      submission.files.map(async (f: SubmissionFileRow) => {
        const { data, error } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(f.storagePath, 60 * 10); // 10 minutes

        if (error) {
          return {
            id: f.id,
            fileName: f.fileName,
            sizeBytes: f.sizeBytes,
            mimeType: f.mimeType,
            url: null as string | null,
          };
        }

        return {
          id: f.id,
          fileName: f.fileName,
          sizeBytes: f.sizeBytes,
          mimeType: f.mimeType,
          url: data!.signedUrl,
        };
      }),
    );

    return NextResponse.json(
      { success: true, data: { files } },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "[ERROR] [GET] /api/submissions/[submissionId]/files",
      error,
    );
    return errorResponse(500, "Internal server error");
  }
}
