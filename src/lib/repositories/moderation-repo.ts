import { prisma } from "@/lib/prisma";

export type QueueItem = {
  id: string;
  type: "announcement" | "comment";
  createdAt: Date;
  content: string;
  organizationId: string | null;
  authorId: string;
};

export const moderationRepo = {
  async listQueue(params: { organizationId?: string | null; type?: "announcement" | "comment" | null; limit?: number; cursor?: string | null }) {
    const { organizationId, type, limit = 20, cursor } = params;
    if (!type || type === "announcement") {
      const items = await prisma.announcement.findMany({
        where: { status: "PENDING", ...(organizationId ? { organizationId } : {}) },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true, organizationId: true, authorId: true },
      });
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }
      const mapped: QueueItem[] = items.map((i) => ({ id: i.id, type: "announcement", createdAt: i.createdAt, content: i.content, organizationId: i.organizationId, authorId: i.authorId }));
      return { items: mapped, nextCursor };
    } else {
      const items = await prisma.announcementComment.findMany({
        where: { status: "PENDING", ...(organizationId ? { announcement: { organizationId } } : {}) },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true, authorId: true, announcement: { select: { organizationId: true } } },
      });
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }
      const mapped: QueueItem[] = items.map((i: any) => ({ id: i.id, type: "comment", createdAt: i.createdAt, content: i.content, organizationId: i.announcement?.organizationId || null, authorId: i.authorId }));
      return { items: mapped, nextCursor };
    }
  },

  async approveAnnouncement(id: string, moderatorId: string) {
    return prisma.announcement.update({ where: { id }, data: { status: "APPROVED", moderatedById: moderatorId, moderatedAt: new Date(), moderationReason: null }, select: { id: true } });
  },
  async rejectAnnouncement(id: string, moderatorId: string, reason: string) {
    return prisma.announcement.update({ where: { id }, data: { status: "REJECTED", moderatedById: moderatorId, moderatedAt: new Date(), moderationReason: reason }, select: { id: true } });
  },
  async approveComment(id: string, moderatorId: string) {
    return prisma.announcementComment.update({ where: { id }, data: { status: "APPROVED", moderatedById: moderatorId, moderatedAt: new Date(), moderationReason: null }, select: { id: true } });
  },
  async rejectComment(id: string, moderatorId: string, reason: string) {
    return prisma.announcementComment.update({ where: { id }, data: { status: "REJECTED", moderatedById: moderatorId, moderatedAt: new Date(), moderationReason: reason }, select: { id: true } });
  },
};


