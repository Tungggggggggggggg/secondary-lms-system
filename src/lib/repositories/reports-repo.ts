import { prisma } from "@/lib/prisma";

export const reportsRepo = {
  async overview(orgId?: string | null) {
    const [users, announcements, comments, pending] = await Promise.all([
      prisma.user.count({ where: orgId ? { organizationMemberships: { some: { organizationId: orgId } } } : {} }),
      prisma.announcement.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.announcementComment.count({ where: orgId ? { announcement: { organizationId: orgId } } : {} }),
      prisma.announcement.count({ where: { status: "PENDING", ...(orgId ? { organizationId: orgId } : {}) } }),
    ]);
    return { users, announcements, comments, pending };
  },

  async usage(orgId?: string | null) {
    // Hoạt động gần đây: 7 ngày gần nhất (announcements + comments)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const anns = await prisma.announcement.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: since }, ...(orgId ? { organizationId: orgId } : {}) },
      _count: { createdAt: true },
    });
    const cmts = await prisma.announcementComment.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: since }, ...(orgId ? { announcement: { organizationId: orgId } } : {}) },
      _count: { createdAt: true },
    });
    return { anns, cmts };
  },

  async growth(orgId?: string | null) {
    // Tăng trưởng user theo ngày (30 ngày gần nhất)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: orgId ? { organizationMemberships: { some: { organizationId: orgId } }, createdAt: { gte: since } } : { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    // Kết gộp theo yyyy-mm-dd
    const map: Record<string, number> = {};
    for (const u of users) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  },
};


