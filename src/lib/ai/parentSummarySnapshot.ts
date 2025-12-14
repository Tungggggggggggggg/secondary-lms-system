import { prisma } from "@/lib/prisma";
import type {
  GenerateParentSummaryParams,
  ParentGradeSnapshotItem,
} from "@/lib/ai/gemini-parent-summary";

function clipText(input: string, maxLen: number): string {
  const s = input.trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

/**
 * Chuẩn bị dữ liệu đầu vào cho `generateParentSmartSummary()`.
 *
 * Input phải là dữ liệu server-side đã được kiểm soát scope (parent–student) ở layer route.
 *
 * Side effects:
 * - Query DB (Prisma)
 */
export async function buildParentSummarySnapshot(params: {
  childId: string;
  studentName: string;
  windowDays: number;
  now: Date;
}): Promise<GenerateParentSummaryParams> {
  const safeWindowDays = Math.min(Math.max(Math.floor(params.windowDays), 7), 90);
  const fromDate = new Date(params.now.getTime() - safeWindowDays * 24 * 60 * 60 * 1000);

  const classroomLinks = await prisma.classroomStudent.findMany({
    where: { studentId: params.childId },
    select: { classroomId: true },
  });

  const classroomIds = classroomLinks.map((cs) => cs.classroomId);
  if (classroomIds.length === 0) {
    return {
      studentName: clipText(params.studentName || "Học sinh", 80),
      windowDays: safeWindowDays,
      averageGrade: 0,
      totalGraded: 0,
      totalSubmitted: 0,
      totalPending: 0,
      items: [],
    };
  }

  const assignmentLinks = await prisma.assignmentClassroom.findMany({
    where: { classroomId: { in: classroomIds } },
    select: { assignmentId: true },
  });

  const assignmentIds = Array.from(new Set(assignmentLinks.map((a) => a.assignmentId)));
  if (assignmentIds.length === 0) {
    return {
      studentName: clipText(params.studentName || "Học sinh", 80),
      windowDays: safeWindowDays,
      averageGrade: 0,
      totalGraded: 0,
      totalSubmitted: 0,
      totalPending: 0,
      items: [],
    };
  }

  const [assignments, assignmentClassrooms, submissions] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        id: { in: assignmentIds },
        OR: [{ dueDate: { gte: fromDate } }, { dueDate: null }],
      },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
      },
    }),
    prisma.assignmentClassroom.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: {
        assignmentId: true,
        classroom: { select: { name: true } },
      },
      orderBy: { addedAt: "desc" },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        studentId: params.childId,
        assignmentId: { in: assignmentIds },
        submittedAt: { gte: fromDate },
      },
      select: {
        id: true,
        assignmentId: true,
        submittedAt: true,
        grade: true,
        feedback: true,
      },
      orderBy: { submittedAt: "desc" },
      take: 120,
    }),
  ]);

  const assignmentById = new Map(assignments.map((a) => [a.id, a]));

  const classroomNameByAssignmentId = new Map<string, string>();
  for (const row of assignmentClassrooms) {
    if (!classroomNameByAssignmentId.has(row.assignmentId)) {
      classroomNameByAssignmentId.set(row.assignmentId, row.classroom.name);
    }
  }

  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));

  const pendingItems: ParentGradeSnapshotItem[] = [];
  for (const a of assignments) {
    if (submittedAssignmentIds.has(a.id)) continue;
    if (!a.dueDate) continue;
    if (a.dueDate < fromDate) continue;

    pendingItems.push({
      assignmentTitle: a.title,
      assignmentType: a.type,
      classroomName: classroomNameByAssignmentId.get(a.id) ?? null,
      dueDate: a.dueDate.toISOString(),
      submittedAt: null,
      grade: null,
      feedback: null,
      status: a.dueDate < params.now ? "overdue" : "pending",
    });
  }

  const submissionItems = submissions
    .map((s): ParentGradeSnapshotItem | null => {
      const a = assignmentById.get(s.assignmentId);
      if (!a) return null;
      return {
        assignmentTitle: a.title,
        assignmentType: a.type,
        classroomName: classroomNameByAssignmentId.get(a.id) ?? null,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        submittedAt: s.submittedAt.toISOString(),
        grade: s.grade,
        feedback: s.feedback,
        status: s.grade !== null ? "graded" : "submitted",
      };
    })
    .filter((x): x is ParentGradeSnapshotItem => x !== null);

  const items = [...submissionItems, ...pendingItems].slice(0, 60);

  const graded = submissions.filter((s) => s.grade !== null);
  const totalGraded = graded.length;
  const averageGrade =
    totalGraded > 0 ? graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / totalGraded : 0;

  const totalSubmitted = submissions.length;
  const totalPending = pendingItems.length + submissions.filter((s) => s.grade === null).length;

  return {
    studentName: clipText(params.studentName || "Học sinh", 80),
    windowDays: safeWindowDays,
    averageGrade: Math.round(averageGrade * 10) / 10,
    totalGraded,
    totalSubmitted,
    totalPending,
    items,
  };
}
