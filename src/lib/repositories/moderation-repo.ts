import { prisma } from "@/lib/prisma";

export type QueueItem = {
  id: string;
  type: "announcement" | "comment";
  createdAt: Date;
  content: string;
  organizationId: string | null;
  authorId: string;
  authorName?: string | null;
  classroomId?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  announcementId?: string | null;
};

export const moderationRepo = {
  async listQueue(params: { organizationId?: string | null; type?: "announcement" | "comment" | null; status?: "PENDING" | "APPROVED" | "REJECTED" | null; startDate?: string | null; endDate?: string | null; limit?: number; cursor?: string | null }) {
    const { organizationId, type, status, startDate, endDate, limit = 20, cursor } = params;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const d = new Date(endDate);
      // set end of day
      d.setHours(23, 59, 59, 999);
      dateFilter.lte = d;
    }
    if (!type || type === "announcement") {
      const items = await prisma.announcement.findMany({
        where: {
          ...(status ? { status } : { status: "PENDING" }),
          ...(organizationId ? { organizationId } : {}),
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          organizationId: true,
          authorId: true,
          author: { select: { fullname: true } },
          classroomId: true,
          classroom: { select: { name: true } },
          status: true,
        },
      });
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }
      const mapped: QueueItem[] = items.map((i: any) => ({
        id: i.id,
        type: "announcement",
        createdAt: i.createdAt,
        content: i.content,
        organizationId: i.organizationId,
        authorId: i.authorId,
        authorName: (i as any).author?.fullname ?? null,
        classroomId: (i as any).classroomId ?? null,
        status: (i as any).status,
        announcementId: i.id,
      }));
      return { items: mapped, nextCursor };
    } else {
      const items = await prisma.announcementComment.findMany({
        where: {
          ...(status ? { status } : { status: "PENDING" }),
          ...(organizationId ? { announcement: { organizationId } } : {}),
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          authorId: true,
          author: { select: { fullname: true } },
          announcement: {
            select: {
              organizationId: true,
              classroomId: true,
              classroom: { select: { name: true } },
              id: true,
            },
          },
          status: true,
        },
      });
      let nextCursor: string | null = null;
      if (items.length > limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }
      const mapped: QueueItem[] = items.map((i: any) => ({
        id: i.id,
        type: "comment",
        createdAt: i.createdAt,
        content: i.content,
        organizationId: i.announcement?.organizationId || null,
        authorId: i.authorId,
        authorName: i.author?.fullname ?? null,
        classroomId: i.announcement?.classroomId ?? null,
        status: i.status,
        announcementId: i.announcement?.id ?? null,
      }));
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


