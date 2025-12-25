import { z } from "zod";

import { settingsRepo } from "@/lib/repositories/settings-repo";
import type { ParentSmartSummary } from "@/lib/ai/gemini-parent-summary";

const CachedParentSummarySchema = z.object({
  version: z.literal(1),
  parentId: z.string().min(1),
  childId: z.string().min(1),
  windowDays: z.number().int().min(7).max(90),
  bucket: z.string().min(1),
  createdAt: z.string().min(1),
  data: z.unknown(),
});

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfIsoWeekUtc(d: Date): Date {
  const day = d.getUTCDay();
  const mondayIndex = (day + 6) % 7;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - mondayIndex);
  return start;
}

/**
 * Tạo bucket cho cache smart summary.
 * - windowDays=7: bucket theo tuần (ISO week start - Monday, UTC)
 * - còn lại: bucket theo ngày (UTC)
 *
 * @param now - thời điểm hiện tại
 * @param windowDays - số ngày summary
 * @returns string bucket
 */
export function getParentSummaryBucket(now: Date, windowDays: number): string {
  if (Math.floor(windowDays) === 7) {
    return toIsoDate(startOfIsoWeekUtc(now));
  }
  return toIsoDate(now);
}

/**
 * Tạo key lưu cache cho parent summary trong `SystemSetting`.
 *
 * @param params - parent/child/windowDays
 * @returns key string
 */
export function getParentSummaryCacheKey(params: {
  parentId: string;
  childId: string;
  windowDays: number;
}): string {
  const safeDays = Math.min(Math.max(Math.floor(params.windowDays), 7), 90);
  return `ai_parent_summary:${params.parentId}:${params.childId}:${safeDays}`;
}

/**
 * Đọc cache nếu bucket hiện tại khớp.
 *
 * @param params - parent/child/windowDays + bucket
 * @returns ParentSmartSummary hoặc null
 */
export async function readParentSummaryCache(params: {
  parentId: string;
  childId: string;
  windowDays: number;
  bucket: string;
}): Promise<{ data: ParentSmartSummary; createdAt: string } | null> {
  const key = getParentSummaryCacheKey({
    parentId: params.parentId,
    childId: params.childId,
    windowDays: params.windowDays,
  });

  const raw = await settingsRepo.get(key);
  const parsed = CachedParentSummarySchema.safeParse(raw);
  if (!parsed.success) return null;

  const value = parsed.data;
  if (value.parentId !== params.parentId) return null;
  if (value.childId !== params.childId) return null;
  if (value.windowDays !== Math.floor(params.windowDays)) return null;
  if (value.bucket !== params.bucket) return null;

  return { data: value.data as ParentSmartSummary, createdAt: value.createdAt };
}

/**
 * Ghi cache cho parent summary.
 *
 * Side effects:
 * - Ghi bảng `system_settings`
 */
export async function writeParentSummaryCache(params: {
  parentId: string;
  childId: string;
  windowDays: number;
  bucket: string;
  data: ParentSmartSummary;
}): Promise<void> {
  const key = getParentSummaryCacheKey({
    parentId: params.parentId,
    childId: params.childId,
    windowDays: params.windowDays,
  });

  await settingsRepo.set(key, {
    version: 1,
    parentId: params.parentId,
    childId: params.childId,
    windowDays: Math.floor(params.windowDays),
    bucket: params.bucket,
    createdAt: new Date().toISOString(),
    data: params.data,
  });
}
