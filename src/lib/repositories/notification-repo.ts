import { prisma } from "@/lib/prisma";
import { coercePrismaJson } from "@/lib/prisma-json";
import { settingsRepo } from "@/lib/repositories/settings-repo";

type NotificationRow = {
  id: string;
  type: string | null;
  title: string;
  description: string | null;
  createdAt: Date;
  read: boolean;
  actionUrl: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  dedupeKey: string | null;
  meta: unknown;
};

type NotificationDelegate = {
  upsert: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  createMany: (args: unknown) => Promise<unknown>;
  deleteMany: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
};

const prismaNotification = (prisma as unknown as { notification?: NotificationDelegate }).notification;

export type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  description?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  dedupeKey?: string;
  meta?: unknown;
};

type CreateNotificationInput = {
  type?: string;
  title: string;
  description?: string;
  actionUrl?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  dedupeKey?: string;
  meta?: unknown;
};

type ListOptions = {
  limit?: number;
};

type AddManyInput = {
  userId: string;
  input: CreateNotificationInput;
};

// Retention: giới hạn số notifications lưu trên DB cho mỗi user.
// Legacy (system_settings JSON) đã mặc định trim ~200 item, nên chỉ cần áp dụng cho DB mode.
const MAX_NOTIFICATIONS_PER_USER = 500;

function normalizeMeta(
  value: unknown
): any {
  return coercePrismaJson(value);
}

function normalizeText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

function generateId(): string {
  try {
    const maybeCrypto = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  } catch {}
  return `n_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getLegacyKey(userId: string): string {
  return `notifications:${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function logLegacyFallback(action: string, err: unknown): void {
  try {
    const isProd = process.env.NODE_ENV === "production";
    const record = isRecord(err) ? err : null;
    const code = record && typeof record.code === "string" ? record.code : null;
    const message = err instanceof Error ? err.message : String(err);
    const payload = { at: new Date().toISOString(), action, code, message };
    if (isProd) {
      console.warn("[notificationRepo] legacy_fallback", payload);
    } else {
      console.warn("[notificationRepo] legacy_fallback", payload);
    }
  } catch {}
}

function shouldFallbackToLegacyOnError(err: unknown): boolean {
  if (!err) return true;
  if (isRecord(err) && typeof err.code === "string") {
    if (err.code === "P2021") return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes("notifications") && msg.toLowerCase().includes("does not exist");
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.title !== "string") return false;
  if (typeof value.createdAt !== "string") return false;
  if (value.read !== undefined && typeof value.read !== "boolean") return false;
  if (value.description !== undefined && typeof value.description !== "string") return false;
  if (value.type !== undefined && typeof value.type !== "string") return false;
  if (value.actionUrl !== undefined && typeof value.actionUrl !== "string") return false;
  if (value.dedupeKey !== undefined && typeof value.dedupeKey !== "string") return false;
  if (
    value.severity !== undefined &&
    value.severity !== "INFO" &&
    value.severity !== "WARNING" &&
    value.severity !== "CRITICAL"
  ) {
    return false;
  }
  return true;
}

async function readLegacyList(userId: string): Promise<NotificationItem[]> {
  const raw = await settingsRepo.get(getLegacyKey(userId));
  if (!Array.isArray(raw)) return [];
  const items: NotificationItem[] = [];
  for (const it of raw) {
    if (isNotificationItem(it)) {
      items.push({
        ...it,
        read: typeof it.read === "boolean" ? it.read : false,
      });
    }
  }
  return items;
}

async function writeLegacyList(userId: string, items: NotificationItem[]): Promise<void> {
  await settingsRepo.set(getLegacyKey(userId), items);
}

async function trimUserNotifications(userId: string): Promise<void> {
  if (!prismaNotification) return;
  try {
    const oldRows = (await prismaNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: MAX_NOTIFICATIONS_PER_USER,
      select: { id: true },
    } as unknown)) as Array<{ id: string }>;

    if (!oldRows.length) return;

    await prismaNotification.deleteMany({
      where: { id: { in: oldRows.map((r) => r.id) } },
    } as unknown);
  } catch (err: unknown) {
    if (!shouldFallbackToLegacyOnError(err)) throw err;
    logLegacyFallback("trimUserNotifications(deleteMany)", err);
  }
}

function rowToItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    createdAt: row.createdAt.toISOString(),
    read: row.read,
    actionUrl: row.actionUrl ?? undefined,
    severity: row.severity,
    dedupeKey: row.dedupeKey ?? undefined,
    meta: row.meta as unknown,
  };
}

async function addLegacySingle(userId: string, next: NotificationItem): Promise<NotificationItem> {
  const current = await readLegacyList(userId);
  let merged: NotificationItem[];
  const dedupeKey = next.dedupeKey;
  if (dedupeKey) {
    const idx = current.findIndex((i) => i.dedupeKey === dedupeKey);
    if (idx >= 0) {
      const existed = current[idx];
      const updated: NotificationItem = {
        ...existed,
        ...next,
        id: existed.id,
        createdAt: new Date().toISOString(),
        read: existed.read,
      };
      merged = [updated, ...current.slice(0, idx), ...current.slice(idx + 1)];
    } else {
      merged = [next, ...current];
    }
  } else {
    merged = [next, ...current];
  }
  merged = merged.slice(0, 200);
  await writeLegacyList(userId, merged);
  return next;
}

async function addManyLegacy(items: AddManyInput[]): Promise<void> {
  const grouped = new Map<string, AddManyInput[]>();
  for (const it of items) {
    const arr = grouped.get(it.userId) ?? [];
    arr.push(it);
    grouped.set(it.userId, arr);
  }

  for (const [userId, list] of grouped) {
    let merged = await readLegacyList(userId);
    for (const it of list) {
      const title = normalizeText(it.input.title, 120);
      const description = it.input.description ? normalizeText(it.input.description, 500) : undefined;
      const type = it.input.type ? normalizeText(it.input.type, 80) : undefined;
      const actionUrl = it.input.actionUrl ? normalizeText(it.input.actionUrl, 1000) : undefined;
      const severity = it.input.severity ?? "INFO";
      const dedupeKey = it.input.dedupeKey ? normalizeText(it.input.dedupeKey, 200) : undefined;

      const next: NotificationItem = {
        id: generateId(),
        type,
        title,
        description,
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl,
        severity,
        dedupeKey,
        meta: it.input.meta,
      };

      if (dedupeKey) {
        const idx = merged.findIndex((n) => n.dedupeKey === dedupeKey);
        if (idx >= 0) {
          const existed = merged[idx];
          const updated: NotificationItem = {
            ...existed,
            ...next,
            id: existed.id,
            createdAt: new Date().toISOString(),
            read: existed.read,
          };
          merged = [updated, ...merged.slice(0, idx), ...merged.slice(idx + 1)];
        } else {
          merged = [next, ...merged];
        }
      } else {
        merged = [next, ...merged];
      }
      merged = merged.slice(0, 200);
    }
    await writeLegacyList(userId, merged);
  }
}

export const notificationRepo = {
  /**
   * Thêm một notification cho user.
   */
  async add(userId: string, input: CreateNotificationInput): Promise<NotificationItem> {
    const title = normalizeText(input.title, 120);
    const description = input.description ? normalizeText(input.description, 500) : undefined;
    const type = input.type ? normalizeText(input.type, 80) : undefined;
    const actionUrl = input.actionUrl ? normalizeText(input.actionUrl, 1000) : undefined;
    const severity = input.severity ?? "INFO";
    const dedupeKey = input.dedupeKey ? normalizeText(input.dedupeKey, 200) : undefined;
    const meta = normalizeMeta(input.meta);

    if (!prismaNotification) {
      const next: NotificationItem = {
        id: generateId(),
        type,
        title,
        description,
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl,
        severity,
        dedupeKey,
        meta: input.meta,
      };
      return addLegacySingle(userId, next);
    }

    if (dedupeKey) {
      try {
        const saved = (await prismaNotification.upsert({
          where: {
            userId_dedupeKey: {
              userId,
              dedupeKey,
            },
          },
          update: {
            type,
            title,
            description,
            actionUrl,
            severity,
            meta: meta ?? undefined,
            createdAt: new Date(),
          },
          create: {
            userId,
            type,
            title,
            description,
            actionUrl,
            severity,
            dedupeKey,
            meta: meta ?? undefined,
          },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            createdAt: true,
            read: true,
            actionUrl: true,
            severity: true,
            dedupeKey: true,
            meta: true,
          },
        })) as NotificationRow;

        await trimUserNotifications(userId);
        return rowToItem(saved);
      } catch (err: unknown) {
        if (!shouldFallbackToLegacyOnError(err)) throw err;
        logLegacyFallback("add(upsert)", err);
        const next: NotificationItem = {
          id: generateId(),
          type,
          title,
          description,
          createdAt: new Date().toISOString(),
          read: false,
          actionUrl,
          severity,
          dedupeKey,
          meta: input.meta,
        };
        return addLegacySingle(userId, next);
      }
    }

    try {
      const saved = (await prismaNotification.create({
        data: {
          userId,
          type,
          title,
          description,
          actionUrl,
          severity,
          meta: meta ?? undefined,
        },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
          read: true,
          actionUrl: true,
          severity: true,
          dedupeKey: true,
          meta: true,
        },
      })) as NotificationRow;

      await trimUserNotifications(userId);
      return rowToItem(saved);
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("add(create)", err);
      const next: NotificationItem = {
        id: generateId(),
        type,
        title,
        description,
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl,
        severity,
        dedupeKey,
        meta: input.meta,
      };
      return addLegacySingle(userId, next);
    }
  },

  /**
   * Thêm nhiều notifications theo batch.
   * Side effects: ghi DB (hoặc fallback vào system_settings legacy khi thiếu bảng/Prisma lỗi).
   */
  async addMany(items: AddManyInput[]): Promise<void> {
    if (items.length === 0) return;

    if (!prismaNotification) {
      await addManyLegacy(items);
      return;
    }

    const chunkSize = 1000;
    for (let i = 0; i < items.length; i += chunkSize) {
      const now = new Date();
      const chunk = items.slice(i, i + chunkSize);
      const rows = chunk.map((it) => {
        const title = normalizeText(it.input.title, 120);
        const description = it.input.description ? normalizeText(it.input.description, 500) : undefined;
        const type = it.input.type ? normalizeText(it.input.type, 80) : undefined;
        const actionUrl = it.input.actionUrl ? normalizeText(it.input.actionUrl, 1000) : undefined;
        const severity = it.input.severity ?? "INFO";
        const dedupeKey = it.input.dedupeKey ? normalizeText(it.input.dedupeKey, 200) : undefined;
        const meta = normalizeMeta(it.input.meta);

        return {
          id: generateId(),
          userId: it.userId,
          type,
          title,
          description,
          actionUrl,
          severity,
          dedupeKey,
          meta: meta ?? undefined,
          createdAt: now,
          updatedAt: now,
        };
      });

      try {
        await prismaNotification.createMany({
          data: rows,
          skipDuplicates: true,
        } as unknown);

        const userIds = Array.from(new Set(chunk.map((it) => it.userId)));
        for (const uid of userIds) {
          await trimUserNotifications(uid);
        }
      } catch (err: unknown) {
        if (!shouldFallbackToLegacyOnError(err)) throw err;
        logLegacyFallback("addMany(createMany)", err);
        await addManyLegacy(chunk);
      }
    }
  },

  /**
   * Đếm số notifications chưa đọc.
   * Side effects: query DB (hoặc fallback legacy).
   */
  async countUnread(userId: string): Promise<number> {
    if (!prismaNotification) {
      const items = await readLegacyList(userId);
      return items.filter((i) => !i.read).length;
    }

    try {
      const n = (await prismaNotification.count({
        where: { userId, read: false },
      } as unknown)) as number;
      return Number(n) || 0;
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("countUnread(count)", err);
      const items = await readLegacyList(userId);
      return items.filter((i) => !i.read).length;
    }
  },

  /**
   * Lấy danh sách notifications của user.
   */
  async list(userId: string, opts?: ListOptions): Promise<NotificationItem[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    if (!prismaNotification) {
      const items = await readLegacyList(userId);
      return items.slice(0, limit);
    }
    let rows: NotificationRow[];
    try {
      rows = (await prismaNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        createdAt: true,
        read: true,
        actionUrl: true,
        severity: true,
        dedupeKey: true,
        meta: true,
      },
      })) as NotificationRow[];
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("list(findMany)", err);
      const items = await readLegacyList(userId);
      return items.slice(0, limit);
    }

    return rows.map((row) => ({
      id: row.id,
      type: row.type ?? undefined,
      title: row.title,
      description: row.description ?? undefined,
      createdAt: row.createdAt.toISOString(),
      read: row.read,
      actionUrl: row.actionUrl ?? undefined,
      severity: row.severity,
      dedupeKey: row.dedupeKey ?? undefined,
      meta: row.meta as unknown,
    }));
  },

  /**
   * Lấy chi tiết 1 notification theo id.
   */
  async get(userId: string, id: string): Promise<NotificationItem | null> {
    if (!prismaNotification) {
      const items = await readLegacyList(userId);
      return items.find((i) => i.id === id) ?? null;
    }
    let row: NotificationRow | null;
    try {
      row = (await prismaNotification.findFirst({
      where: { id, userId },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        createdAt: true,
        read: true,
        actionUrl: true,
        severity: true,
        dedupeKey: true,
        meta: true,
      },
      })) as NotificationRow | null;
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("get(findFirst)", err);
      const items = await readLegacyList(userId);
      return items.find((i) => i.id === id) ?? null;
    }

    if (!row) return null;
    return {
      id: row.id,
      type: row.type ?? undefined,
      title: row.title,
      description: row.description ?? undefined,
      createdAt: row.createdAt.toISOString(),
      read: row.read,
      actionUrl: row.actionUrl ?? undefined,
      severity: row.severity,
      dedupeKey: row.dedupeKey ?? undefined,
      meta: row.meta as unknown,
    };
  },

  /**
   * Đánh dấu đã đọc cho 1 notification.
   */
  async markRead(userId: string, id: string): Promise<NotificationItem | null> {
    if (!prismaNotification) {
      const items = await readLegacyList(userId);
      let found: NotificationItem | null = null;
      const next = items.map((i) => {
        if (i.id !== id) return i;
        found = { ...i, read: true };
        return found;
      });
      if (!found) return null;
      await writeLegacyList(userId, next);
      return found;
    }
    let existed: { id: string } | null;
    try {
      existed = (await prismaNotification.findFirst({
        where: { id, userId },
        select: { id: true },
      })) as { id: string } | null;
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("markRead(findFirst)", err);
      const items = await readLegacyList(userId);
      let found: NotificationItem | null = null;
      const next = items.map((i) => {
        if (i.id !== id) return i;
        found = { ...i, read: true };
        return found;
      });
      if (!found) return null;
      await writeLegacyList(userId, next);
      return found;
    }
    if (!existed) return null;

    try {
      const updated = (await prismaNotification.update({
        where: { id },
        data: { read: true, readAt: new Date() },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
          read: true,
          actionUrl: true,
          severity: true,
          dedupeKey: true,
          meta: true,
        },
      })) as NotificationRow;

      return rowToItem(updated);
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("markRead(update)", err);
      const items = await readLegacyList(userId);
      let found: NotificationItem | null = null;
      const next = items.map((i) => {
        if (i.id !== id) return i;
        found = { ...i, read: true };
        return found;
      });
      if (!found) return null;
      await writeLegacyList(userId, next);
      return found;
    }
  },

  /**
   * Đánh dấu tất cả notifications là đã đọc.
   */
  async markAllRead(userId: string): Promise<number> {
    if (!prismaNotification) {
      const items = await readLegacyList(userId);
      const next = items.map((i) => ({ ...i, read: true }));
      await writeLegacyList(userId, next);
      return items.length;
    }
    try {
      const res = await prismaNotification.updateMany({
        where: { userId, read: false },
        data: { read: true, readAt: new Date() },
      } as unknown);
      return res.count;
    } catch (err: unknown) {
      if (!shouldFallbackToLegacyOnError(err)) throw err;
      logLegacyFallback("markAllRead(updateMany)", err);
      const items = await readLegacyList(userId);
      const next = items.map((i) => ({ ...i, read: true }));
      await writeLegacyList(userId, next);
      return items.length;
    }
  },
};
