import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";

const bodySchema = z
  .object({
    studentId: z.string().min(1),
    grade: z.number().min(0).max(10),
    feedback: z.string().max(5000).optional(),
  })
  .strict();

/**
 * POST /api/assignments/[id]/file-grade
 * Grade a file-based submission by studentId. Creates/updates assignmentSubmission record to store grade/feedback.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const assignmentId = params.id;
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) return errorResponse(403, "Forbidden");

    const rawBody: unknown = await req.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedBody.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const { studentId, grade, feedback } = parsedBody.data;

    // Upsert assignmentSubmission for grade storage
    const existing = await prisma.assignmentSubmission.findFirst({ where: { assignmentId, studentId } });
    const updated = existing
      ? await prisma.assignmentSubmission.update({ where: { id: existing.id }, data: { grade, feedback: feedback?.trim() || null } })
      : await prisma.assignmentSubmission.create({
          data: {
            assignmentId,
            studentId,
            content: "",
            grade,
            feedback: feedback?.trim() || null,
          },
        });

    return NextResponse.json({ success: true, data: { id: updated.id, grade: updated.grade, feedback: updated.feedback } }, { status: 200 });
  } catch (error: unknown) {
    console.error("[ERROR] [POST] /api/assignments/[id]/file-grade", error);
    return errorResponse(500, "Internal server error");
  }
}


