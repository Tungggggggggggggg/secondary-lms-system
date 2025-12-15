import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, getAuthenticatedUser } from "@/lib/api-utils";

const bodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  copyClassrooms: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) return errorResponse(401, "Unauthorized");
    if (authUser.role !== "TEACHER") return errorResponse(403, "Forbidden");

    const teacherId = authUser.id;
    const assignmentId = params.id;

    const rawBody: unknown = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const newTitle = parsed.data.title;
    const copyClassrooms = parsed.data.copyClassrooms;

    const original = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        questions: { include: { options: true }, orderBy: { order: "asc" } },
        classrooms: true,
      },
    });
    if (!original) {
      return errorResponse(404, "Not found");
    }
    if (original.authorId !== teacherId) {
      return errorResponse(403, "Forbidden");
    }

    const created = await prisma.$transaction(async (tx) => {
      const createdAssignment = await tx.assignment.create({
        data: {
          title: newTitle && newTitle.trim() ? newTitle.trim() : `${original.title} (Copy)`,
          description: original.description ?? null,
          type: original.type,
          dueDate: original.dueDate ?? null,
          openAt: original.openAt ?? null,
          lockAt: original.lockAt ?? null,
          timeLimitMinutes: original.timeLimitMinutes ?? null,
          subject: original.subject ?? null,
          submission_format: original.submission_format ?? null,
          max_attempts: original.max_attempts ?? null,
          anti_cheat_config: original.anti_cheat_config ?? undefined,
          authorId: teacherId,
          courseId: original.courseId ?? null,
          organizationId: original.organizationId ?? null,
        },
      });

      for (const q of original.questions) {
        const cq = await tx.question.create({
          data: {
            content: q.content,
            type: q.type,
            order: q.order,
            assignmentId: createdAssignment.id,
          },
        });
        if (q.options && q.options.length > 0) {
          await tx.option.createMany({
            data: q.options.map((o) => ({
              label: o.label,
              content: o.content,
              isCorrect: o.isCorrect,
              order: o.order,
              questionId: cq.id,
            })),
          });
        }
      }

      if (copyClassrooms && original.classrooms && original.classrooms.length > 0) {
        await tx.assignmentClassroom.createMany({
          data: original.classrooms.map((ac) => ({ classroomId: ac.classroomId, assignmentId: createdAssignment.id })),
          skipDuplicates: true,
        });
      }

      return createdAssignment;
    });

    return NextResponse.json({ success: true, data: { id: created.id } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/teachers/assignments/[id]/duplicate]", error);
    return errorResponse(500, "Internal server error");
  }
}
