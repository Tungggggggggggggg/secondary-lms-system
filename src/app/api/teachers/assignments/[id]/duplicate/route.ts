import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const teacherId = String(session.user.id);
    const assignmentId = params.id;
    const body = await req.json().catch(() => ({}));
    const newTitle: string | undefined = body?.title;
    const copyClassrooms: boolean = Boolean(body?.copyClassrooms);

    const original = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        questions: { include: { options: true }, orderBy: { order: "asc" } },
        classrooms: true,
      },
    });
    if (!original) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    if (original.authorId !== teacherId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
