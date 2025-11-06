import { prisma } from "@/lib/prisma";

type CacheEntry = { value: any; expiresAt: number };
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
    const value = row?.value ?? null;
    cache.set(key, { value, expiresAt: now() + CACHE_TTL_MS });
    return value;
  },

  async set(key: string, value: any) {
    const saved = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
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


