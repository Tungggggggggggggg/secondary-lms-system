import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { errorResponse, withApiLogging } from "@/lib/api-utils";
import { notificationRepo } from "@/lib/repositories/notification-repo";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  dryRun: z.coerce.boolean().optional().default(false),
  toleranceMinutes: z.coerce.number().int().min(5).max(180).optional().default(30),
  includeOverdue: z.coerce.boolean().optional().default(true),
  overdueLookbackDays: z.coerce.number().int().min(1).max(60).optional().default(14),
});

function isAuthorizedCron(req: NextRequest, expectedSecret: string): boolean {
  const header = req.headers.get("x-cron-secret");
  if (header && header === expectedSecret) return true;

  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return false;
  return m[1] === expectedSecret;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60_000);
}

function dateBucket(d: Date): string {
  // yyyy-mm-dd
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function hasStudentSubmitted(params: { assignmentId: string; studentIds: string[] }) {
  const { assignmentId, studentIds } = params;
  if (studentIds.length === 0) return new Set<string>();

  const [essayQuizSubs, fileSubs] = await Promise.all([
    prisma.assignmentSubmission.findMany({
      where: { assignmentId, studentId: { in: studentIds } },
      select: { studentId: true },
    }),
    prisma.submission.findMany({
      where: { assignmentId, studentId: { in: studentIds }, status: "submitted" },
      select: { studentId: true },
    }),
  ]);

  const submitted = new Set<string>();
  for (const r of essayQuizSubs) submitted.add(r.studentId);
  for (const r of fileSubs) submitted.add(r.studentId);
  return submitted;
}

const handler = withApiLogging(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return errorResponse(500, "Cron chưa được cấu hình.");

  if (!isAuthorizedCron(req, cronSecret)) {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      return errorResponse(401, "Unauthorized", {
        details:
          "Thiếu hoặc sai CRON_SECRET. PowerShell không tự đọc .env → hãy set `$env:CRON_SECRET='...'` hoặc truyền header `x-cron-secret: <CRON_SECRET>`.",
      });
    }
    return errorResponse(401, "Unauthorized");
  }

  const parsed = querySchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    dryRun: req.nextUrl.searchParams.get("dryRun") ?? undefined,
    toleranceMinutes: req.nextUrl.searchParams.get("toleranceMinutes") ?? undefined,
    includeOverdue: req.nextUrl.searchParams.get("includeOverdue") ?? undefined,
    overdueLookbackDays: req.nextUrl.searchParams.get("overdueLookbackDays") ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    });
  }

  const { limit, dryRun, toleranceMinutes, includeOverdue, overdueLookbackDays } = parsed.data;

  const now = new Date();
  const tol = toleranceMinutes;

  const window24Start = addMinutes(now, 24 * 60 - tol);
  const window24End = addMinutes(now, 24 * 60 + tol);
  const window3Start = addMinutes(now, 3 * 60 - tol);
  const window3End = addMinutes(now, 3 * 60 + tol);

  const overdueStart = addDays(now, -overdueLookbackDays);

  // Effective deadline = COALESCE(lockAt, dueDate)
  const [due24, due3, overdue] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        OR: [
          { lockAt: { gte: window24Start, lte: window24End } },
          { AND: [{ lockAt: null }, { dueDate: { gte: window24Start, lte: window24End } }] },
        ],
      },
      take: limit,
      select: { id: true, title: true, lockAt: true, dueDate: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.assignment.findMany({
      where: {
        OR: [
          { lockAt: { gte: window3Start, lte: window3End } },
          { AND: [{ lockAt: null }, { dueDate: { gte: window3Start, lte: window3End } }] },
        ],
      },
      take: limit,
      select: { id: true, title: true, lockAt: true, dueDate: true },
      orderBy: { updatedAt: "desc" },
    }),
    includeOverdue
      ? prisma.assignment.findMany({
          where: {
            OR: [
              { lockAt: { lt: now, gte: overdueStart } },
              { AND: [{ lockAt: null }, { dueDate: { lt: now, gte: overdueStart } }] },
            ],
          },
          take: limit,
          select: { id: true, title: true, lockAt: true, dueDate: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const results: Array<{
    kind: "DUE_24H" | "DUE_3H" | "OVERDUE";
    assignmentId: string;
    recipients: number;
    notifiedStudents: number;
    notifiedParents: number;
  }> = [];

  async function processAssignment(kind: "DUE_24H" | "DUE_3H" | "OVERDUE", a: { id: string; title: string; lockAt: Date | null; dueDate: Date | null }) {
    // Find all students who have this assignment via assignment_classrooms -> classroom_students
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: {
        classroom: {
          assignments: { some: { assignmentId: a.id } },
        },
      },
      select: { studentId: true, classroomId: true },
    });

    const studentIds = Array.from(new Set(classroomStudents.map((x) => x.studentId)));
    if (studentIds.length === 0) {
      results.push({ kind, assignmentId: a.id, recipients: 0, notifiedStudents: 0, notifiedParents: 0 });
      return;
    }

    const submittedSet = await hasStudentSubmitted({ assignmentId: a.id, studentIds });
    const pendingStudentIds = studentIds.filter((sid) => !submittedSet.has(sid));

    const parentLinks = await prisma.parentStudent.findMany({
      where: { studentId: { in: pendingStudentIds }, status: "ACTIVE" },
      select: { parentId: true, studentId: true },
    });

    const parentsByStudentId = new Map<string, string[]>();
    for (const link of parentLinks) {
      const arr = parentsByStudentId.get(link.studentId) ?? [];
      arr.push(link.parentId);
      parentsByStudentId.set(link.studentId, arr);
    }

    const deadline = a.lockAt ?? a.dueDate;
    const deadlineStr = deadline ? new Date(deadline).toLocaleString("vi-VN") : "";

    const actionUrlStudent = `/dashboard/student/assignments/${a.id}`;

    let notifiedStudents = 0;
    let notifiedParents = 0;

    for (const sid of pendingStudentIds) {
      const parents = parentsByStudentId.get(sid) ?? [];

      const dedupeBase =
        kind === "DUE_24H"
          ? `due24:${a.id}:${sid}`
          : kind === "DUE_3H"
          ? `due3:${a.id}:${sid}`
          : `overdue:${a.id}:${sid}:${dateBucket(now)}`;

      const title =
        kind === "DUE_24H"
          ? `Sắp đến hạn (24h): ${a.title}`
          : kind === "DUE_3H"
          ? `Sắp đến hạn (3h): ${a.title}`
          : `Quá hạn: ${a.title}`;

      const description =
        kind === "OVERDUE"
          ? `Bài đã quá hạn${deadlineStr ? ` (${deadlineStr})` : ""}.` 
          : `Hạn nộp${deadlineStr ? `: ${deadlineStr}` : ""}.`;

      if (!dryRun) {
        await notificationRepo.add(sid, {
          type:
            kind === "DUE_24H"
              ? "STUDENT_ASSIGNMENT_DUE_24H"
              : kind === "DUE_3H"
              ? "STUDENT_ASSIGNMENT_DUE_3H"
              : "STUDENT_ASSIGNMENT_OVERDUE",
          title,
          description,
          actionUrl: actionUrlStudent,
          dedupeKey: dedupeBase,
          meta: { assignmentId: a.id, deadline: deadline ? deadline.toISOString() : null, kind },
        });
      }
      notifiedStudents += 1;

      for (const pid of parents) {
        if (!dryRun) {
          await notificationRepo.add(pid, {
            type:
              kind === "DUE_24H"
                ? "PARENT_CHILD_DUE_24H"
                : kind === "DUE_3H"
                ? "PARENT_CHILD_DUE_3H"
                : "PARENT_CHILD_OVERDUE",
            title,
            description,
            actionUrl: "/dashboard/parent/progress",
            dedupeKey: `${dedupeBase}:${pid}`,
            meta: { assignmentId: a.id, studentId: sid, deadline: deadline ? deadline.toISOString() : null, kind },
          });
        }
        notifiedParents += 1;
      }
    }

    results.push({
      kind,
      assignmentId: a.id,
      recipients: pendingStudentIds.length,
      notifiedStudents,
      notifiedParents,
    });
  }

  for (const a of due24) {
    await processAssignment("DUE_24H", a);
  }
  for (const a of due3) {
    await processAssignment("DUE_3H", a);
  }
  for (const a of overdue) {
    await processAssignment("OVERDUE", a);
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        dryRun,
        limit,
        toleranceMinutes: tol,
        includeOverdue,
        overdueLookbackDays,
        windows: {
          now: now.toISOString(),
          due24: { from: window24Start.toISOString(), to: window24End.toISOString() },
          due3: { from: window3Start.toISOString(), to: window3End.toISOString() },
          overdueFrom: overdueStart.toISOString(),
        },
        counts: {
          due24: due24.length,
          due3: due3.length,
          overdue: overdue.length,
        },
        results,
      },
    },
    { status: 200 }
  );
}, "CRON_ASSIGNMENT_DEADLINE_REMINDERS");

export const GET = handler;
export const POST = handler;
