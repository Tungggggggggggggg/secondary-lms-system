import { prisma } from "@/lib/prisma";

export type Paginated<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
};

// Repository cho User phục vụ trang Admin
export const userRepo = {
  async listByOrganization(params: { organizationId: string; limit?: number; cursor?: string | null; search?: string | null; includeRole?: boolean }) {
    const { organizationId, limit = 20, cursor, search } = params;
    const where: any = {
      organizationMemberships: { some: { organizationId } },
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { fullname: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        createdAt: true,
        organizationMemberships: { where: { organizationId }, select: { id: true } },
      },
    });

    let nextCursor: string | null = null;
    if (users.length > limit) {
      const last = users.pop()!;
      nextCursor = last.id;
    }
    return { items: users, nextCursor } as Paginated<typeof users[number]>;
  },

  async createUser(params: { email: string; fullname: string; passwordHash: string; globalRole: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"; organizationId?: string | null }) {
    const { email, fullname, passwordHash, globalRole, organizationId } = params;
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, fullname, password: passwordHash, role: globalRole },
        select: { id: true, email: true, fullname: true, role: true, createdAt: true },
      });
      if (organizationId) {
        await tx.organizationMember.create({ data: { organizationId, userId: user.id } });
      }
      return user;
    });
  },

  async updateUser(params: { id: string; fullname?: string; email?: string; globalRole?: "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT"; disable?: boolean }) {
    const { id, fullname, email, globalRole } = params;
    const data: any = {};
    if (fullname !== undefined) data.fullname = fullname;
    if (email !== undefined) data.email = email;
    if (globalRole !== undefined) data.role = globalRole;
    return prisma.user.update({ where: { id }, data, select: { id: true, email: true, fullname: true, role: true } });
  },

  async removeFromOrganization(params: { userId: string; organizationId: string }) {
    const { userId, organizationId } = params;
    await prisma.organizationMember.deleteMany({ where: { userId, organizationId } });
  },

  async addToOrganization(params: { userId: string; organizationId: string }) {
    const { userId, organizationId } = params;
    await prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: {},
      create: { organizationId, userId },
    });
  },
};


