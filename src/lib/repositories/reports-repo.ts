import { prisma } from "@/lib/prisma";

export const reportsRepo = {
  async overview(orgId?: string | null) {
    const [
      users,
      classrooms,
      courses,
      assignments,
      submissions,
      announcements,
      comments,
      pending,
      hiddenComments,
      lockedAnnouncements,
      deletedComments,
    ] = await Promise.all([
      prisma.user.count({ where: orgId ? { organizationMemberships: { some: { organizationId: orgId } } } : {} }),
      prisma.classroom.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.course.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.assignment.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.assignmentSubmission.count({ where: orgId ? { assignment: { organizationId: orgId } } : {} }),
      prisma.announcement.count({ where: orgId ? { organizationId: orgId } : {} }),
      prisma.announcementComment.count({ where: orgId ? { announcement: { organizationId: orgId } } : {} }),
      prisma.announcement.count({ where: { status: "PENDING", ...(orgId ? { organizationId: orgId } : {}) } }),
      prisma.announcementComment.count({ where: { status: "REJECTED", ...(orgId ? { announcement: { organizationId: orgId } } : {}) } }),
      (async () => {
        if (orgId) {
          const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "announcements" WHERE "comments_locked" = true AND "organizationId" = ${orgId}`;
          return Number(rows?.[0]?.count ?? 0);
        }
        const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "announcements" WHERE "comments_locked" = true`;
        return Number(rows?.[0]?.count ?? 0);
      })(),
      (async () => {
        if (orgId) {
          const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "audit_logs" WHERE action = 'COMMENT_DELETE' AND "organizationId" = ${orgId}`;
          return Number(rows?.[0]?.count ?? 0);
        }
        const rows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint AS count FROM "audit_logs" WHERE action = 'COMMENT_DELETE'`;
        return Number(rows?.[0]?.count ?? 0);
      })(),
    ]);
    return { users, classrooms, courses, assignments, submissions, announcements, comments, pending, hiddenComments, lockedAnnouncements, deletedComments };
  },

  async usage(orgId?: string | null) {
    // Hoạt động gần đây: 7 ngày gần nhất (gộp theo ngày)
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Announcements theo ngày
    const annsRows = orgId
      ? await prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "announcements"
          WHERE "createdAt" >= ${since} AND "organizationId" = ${orgId}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      : await prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "announcements"
          WHERE "createdAt" >= ${since}
          GROUP BY 1
          ORDER BY 1 ASC
        `;
    // Comments theo ngày (join theo org)
    const cmtsRows = orgId
      ? await prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', c."createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "announcement_comments" c
          JOIN "announcements" a ON a.id = c."announcementId"
          WHERE c."createdAt" >= ${since} AND a."organizationId" = ${orgId}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      : await prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', c."createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "announcement_comments" c
          WHERE c."createdAt" >= ${since}
          GROUP BY 1
          ORDER BY 1 ASC
        `;

    type UsageRow = { date: string; count: bigint };

    const anns = annsRows.map((r: UsageRow) => ({ date: r.date, count: Number(r.count) }));
    const cmts = cmtsRows.map((r: UsageRow) => ({ date: r.date, count: Number(r.count) }));
    return { anns, cmts };
  },

  async growth(orgId?: string | null) {
    // Tăng trưởng user theo ngày (30 ngày gần nhất)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    type GrowthRow = { date: string; count: bigint };

    const rows = orgId
      ? await prisma.$queryRaw<GrowthRow[]>`
          SELECT to_char(date_trunc('day', u."createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "users" u
          JOIN "organization_members" om ON om."userId" = u.id
          WHERE u."createdAt" >= ${since} AND om."organizationId" = ${orgId}
          GROUP BY 1
          ORDER BY 1 ASC
        `
      : await prisma.$queryRaw<GrowthRow[]>`
          SELECT to_char(date_trunc('day', u."createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::bigint AS count
          FROM "users" u
          WHERE u."createdAt" >= ${since}
          GROUP BY 1
          ORDER BY 1 ASC
        `;

    return rows.map((r: GrowthRow) => ({ date: r.date, count: Number(r.count) }));
  },
};


