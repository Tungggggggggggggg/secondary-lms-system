import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser, getStudentClassroomForAssignment } from "@/lib/api-utils";

const paramsSchema = z
  .object({
    id: z.string().min(1).max(100),
  })
  .strict();

/**
 * GET /api/students/assignments/[id]/submission
 * Lấy submission của student cho assignment này (nếu có)
 * NOTE: API này vẫn được giữ lại để backward compatibility, nhưng khuyến nghị sử dụng combined endpoint /api/students/assignments/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Sử dụng getAuthenticatedUser với caching
    const user = await getAuthenticatedUser(req);
    if (!user) return errorResponse(401, "Unauthorized");
    if (user.role !== "STUDENT") return errorResponse(403, "Forbidden");

    const parsedParams = paramsSchema.safeParse(params);
    if (!parsedParams.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsedParams.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    }

    const assignmentId = parsedParams.data.id;

    // Optimize: Kiểm tra student có trong classroom nào có assignment này không (single query)
    const classroomId = await getStudentClassroomForAssignment(user.id, assignmentId);
    if (!classroomId) {
      return errorResponse(403, "Forbidden - Not a member of this assignment's classroom");
    }

    // Lấy submission của student
    const submission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignmentId,
        studentId: user.id,
      },
      orderBy: { attempt: "desc" },
      select: {
        id: true,
        assignmentId: true,
        content: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        attempt: true,
        presentation: true,
        contentSnapshot: true,
        assignment: {
          select: {
            id: true,
            title: true,
            type: true,
            dueDate: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    // Transform data
    const submissionData = {
      id: submission.id,
      assignmentId: submission.assignmentId,
      content: submission.content,
      grade: submission.grade,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt.toISOString(),
      presentation: submission.presentation ?? null,
      contentSnapshot: submission.contentSnapshot ?? null,
      assignment: submission.assignment,
      attempt: submission.attempt,
    };

    return NextResponse.json(
      { success: true, data: submissionData },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "[ERROR] [GET] /api/students/assignments/[id]/submission - Error:",
      error
    );
    return errorResponse(500, "Internal server error");
  }
}


