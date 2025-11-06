import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, isTeacherOfAssignment } from "@/lib/api-utils";
import { UserRole } from "@prisma/client";

/**
 * POST /api/assignments/[id]/file-grade
 * Grade a file-based submission by studentId. Creates/updates assignmentSubmission record to store grade/feedback.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(req, UserRole.TEACHER);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const assignmentId = params.id;
    const isOwner = await isTeacherOfAssignment(user.id, assignmentId);
    if (!isOwner) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { studentId, grade, feedback } = body as { studentId?: string; grade?: number; feedback?: string };
    if (!studentId || grade === undefined) {
      return NextResponse.json({ success: false, message: "studentId and grade are required" }, { status: 400 });
    }
    if (grade < 0 || grade > 10) {
      return NextResponse.json({ success: false, message: "Grade must be 0-10" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("[ERROR] [POST] /api/assignments/[id]/file-grade", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}


