import { settingsRepo } from "@/lib/repositories/settings-repo";

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  read: boolean;
};

type CreateNotificationInput = {
  title: string;
  description?: string;
};

type ListOptions = {
  limit?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(): string {
  try {
    const maybeCrypto = globalThis.crypto as unknown as { randomUUID?: () => string } | undefined;
    if (maybeCrypto?.randomUUID) {
      return maybeCrypto.randomUUID();
    }
    throw new Error("randomUUID not available");
  } catch {
    return `n_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function normalizeText(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

function getKey(userId: string): string {
  return `notifications:${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string") return false;
  if (typeof value.title !== "string") return false;
  if (typeof value.createdAt !== "string") return false;
  if (typeof value.read !== "boolean") return false;
  if (value.description !== undefined && typeof value.description !== "string") return false;
  return true;
}

async function readList(userId: string): Promise<NotificationItem[]> {
  const raw = await settingsRepo.get(getKey(userId));
  if (!Array.isArray(raw)) return [];
  const items: NotificationItem[] = [];
  for (const it of raw) {
    if (isNotificationItem(it)) items.push(it);
  }
  return items;
}

async function writeList(userId: string, items: NotificationItem[]): Promise<void> {
  await settingsRepo.set(getKey(userId), items);
}

export const notificationRepo = {
  /**
   * Thêm một notification cho user.
   */
  async add(userId: string, input: CreateNotificationInput): Promise<NotificationItem> {
    const title = normalizeText(input.title, 120);
    const description = input.description ? normalizeText(input.description, 500) : undefined;

    const next: NotificationItem = {
      id: generateId(),
      title,
      description,
      createdAt: nowIso(),
      read: false,
    };

    const current = await readList(userId);
    const merged = [next, ...current].slice(0, 200);
    await writeList(userId, merged);
    return next;
  },

  /**
   * Lấy danh sách notifications của user.
   */
  async list(userId: string, opts?: ListOptions): Promise<NotificationItem[]> {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const items = await readList(userId);
    return items.slice(0, limit);
  },

  /**
   * Lấy chi tiết 1 notification theo id.
   */
  async get(userId: string, id: string): Promise<NotificationItem | null> {
    const items = await readList(userId);
    return items.find((i) => i.id === id) ?? null;
  },

  /**
   * Đánh dấu đã đọc cho 1 notification.
   */
  async markRead(userId: string, id: string): Promise<NotificationItem | null> {
    const items = await readList(userId);
    let found: NotificationItem | null = null;
    const next = items.map((i) => {
      if (i.id !== id) return i;
      found = { ...i, read: true };
      return found;
    });
    if (!found) return null;
    await writeList(userId, next);
    return found;
  },

  /**
   * Đánh dấu tất cả notifications là đã đọc.
   */
  async markAllRead(userId: string): Promise<number> {
    const items = await readList(userId);
    const next = items.map((i) => ({ ...i, read: true }));
    await writeList(userId, next);
    return items.length;
  },
};
