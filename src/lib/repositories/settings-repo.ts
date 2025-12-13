import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type SettingValue = unknown | null;
type CacheEntry = { value: SettingValue; expiresAt: number };
const CACHE_TTL_MS = 60_000; // 60s
const cache = new Map<string, CacheEntry>();

function now() {
  return Date.now();
}

export const settingsRepo = {
  async listKeys() {
    const items = await prisma.systemSetting.findMany({ select: { key: true, updatedAt: true } });
    return items;
  },

  async get(key: string) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now()) {
      return hit.value ?? null;
    }
    const row = await prisma.systemSetting.findUnique({ where: { key }, select: { value: true } });
    const value = (row?.value as SettingValue) ?? null;
    cache.set(key, { value, expiresAt: now() + CACHE_TTL_MS });
    return value;
  },

  async set(key: string, value: unknown) {
    const saved = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue },
      create: { key, value: value as Prisma.InputJsonValue },
      select: { key: true },
    });
    cache.delete(key); // bust cache ngay
    return saved;
  },

  async remove(key: string) {
    await prisma.systemSetting.delete({ where: { key } }).catch(() => {});
    cache.delete(key);
  },
};


