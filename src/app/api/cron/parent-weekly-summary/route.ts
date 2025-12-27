import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, withApiLogging } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { notificationRepo } from "@/lib/repositories/notification-repo";
import { generateParentSmartSummary } from "@/lib/ai/gemini-parent-summary";
import {
  getParentSummaryBucket,
  readParentSummaryCache,
  writeParentSummaryCache,
} from "@/lib/ai/parentSummaryCache";
import { buildParentSummarySnapshot } from "@/lib/ai/parentSummarySnapshot";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  dryRun: z.coerce.boolean().optional().default(false),
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

function trendLabel(trend: "improving" | "declining" | "stable" | "unknown"): string {
  switch (trend) {
    case "improving":
      return "Có tiến bộ";
    case "declining":
      return "Có dấu hiệu giảm";
    case "stable":
      return "Ổn định";
    default:
      return "Chưa đủ dữ liệu";
  }
}

/**
 * POST /api/cron/parent-weekly-summary
 *
 * Sinh smart summary 7 ngày cho phụ huynh theo lịch (Vercel Cron).
 * Bảo vệ bằng `CRON_SECRET` thông qua header `x-cron-secret` hoặc `Authorization: Bearer ...`.
 */
const handler = withApiLogging(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return errorResponse(500, "Cron chưa được cấu hình.");
  }

  if (!isAuthorizedCron(req, cronSecret)) {
    return errorResponse(401, "Unauthorized");
  }

  const parsedQuery = querySchema.safeParse({
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    dryRun: req.nextUrl.searchParams.get("dryRun") ?? undefined,
  });

  if (!parsedQuery.success) {
    return errorResponse(400, "Dữ liệu không hợp lệ", {
      details: parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { limit, dryRun } = parsedQuery.data;

  const links = await prisma.parentStudent.findMany({
    where: { status: "ACTIVE" },
    take: limit,
    select: {
      parentId: true,
      studentId: true,
      parent: { select: { id: true, fullname: true } },
      student: { select: { id: true, fullname: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const windowDays = 7;
  const bucket = getParentSummaryBucket(now, windowDays);

  let processed = 0;
  let skippedCached = 0;
  let notified = 0;
  const errors: Array<{ parentId: string; childId: string; message: string }> = [];

  const notificationBatch: Array<{
    userId: string;
    input: { title: string; description?: string };
  }> = [];

  for (const link of links) {
    const parentId = link.parentId;
    const childId = link.studentId;
    const studentName = link.student.fullname || "Học sinh";

    if (link.student.role !== "STUDENT") {
      continue;
    }

    try {
      const cached = await readParentSummaryCache({
        parentId,
        childId,
        windowDays,
        bucket,
      });
      if (cached) {
        skippedCached++;
        continue;
      }

      if (dryRun) {
        processed++;
        continue;
      }

      const snapshot = await buildParentSummarySnapshot({
        childId,
        studentName,
        windowDays,
        now,
      });

      const summary = await generateParentSmartSummary(snapshot);

      try {
        await writeParentSummaryCache({ parentId, childId, windowDays, bucket, data: summary });
      } catch {}

      processed++;

      try {
        notificationBatch.push({
          userId: parentId,
          input: {
            title: `Tóm tắt tuần của ${studentName}`,
            description: `${trendLabel(summary.trend)}. ${summary.summary}`.slice(0, 500),
          },
        });
      } catch {}

      try {
        await auditRepo.write({
          actorId: parentId,
          actorRole: "PARENT",
          action: "AI_PARENT_WEEKLY_SUMMARY_CRON",
          entityType: "USER",
          entityId: childId,
          metadata: { windowDays, bucket, cron: true },
        });
      } catch {}
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ parentId, childId, message });
      continue;
    }
  }

  try {
    if (!dryRun && notificationBatch.length > 0) {
      await notificationRepo.addMany(notificationBatch);
      notified += notificationBatch.length;
    }
  } catch {}

  return NextResponse.json(
    {
      success: true,
      data: {
        windowDays,
        bucket,
        dryRun,
        processed,
        skippedCached,
        notified,
        totalLinks: links.length,
        errors,
      },
    },
    { status: 200 }
  );
}, "CRON_PARENT_WEEKLY_SUMMARY");

export const GET = handler;
export const POST = handler;
