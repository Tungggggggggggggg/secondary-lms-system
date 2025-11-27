import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type GlobalUserRole =
  | "SUPER_ADMIN"
  | "STAFF"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

export type Paginated<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
};

export type RepoUser = {
  id: string;
  email: string;
  fullname: string | null;
  role: string;
  createdAt: Date;
};

// Repository cho User phục vụ trang Admin
export const userRepo = {
  async listByOrganization(params: { organizationId: string; limit?: number; cursor?: string | null; search?: string | null; includeRole?: boolean }) {
    const { organizationId, limit = 20, cursor, search } = params;
    const where: {
      organizationMemberships: { some: { organizationId: string } };
      OR?: { email?: { contains: string; mode: "insensitive" }; fullname?: { contains: string; mode: "insensitive" } }[];
    } = {
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

  async createUser(params: { email: string; fullname: string; passwordHash: string; globalRole: GlobalUserRole; organizationId?: string | null }): Promise<RepoUser> {
    const { email, fullname, passwordHash, globalRole, organizationId } = params;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: { email, fullname, password: passwordHash, role: 'STUDENT' as any },
        select: { id: true, email: true, fullname: true, role: true, createdAt: true },
      });
      if (organizationId) {
        const mappedOrgRole = ((): any => {
          const r = (globalRole || 'STUDENT') as any;
          if (r === 'STAFF') return 'ADMIN';
          return ['TEACHER','STUDENT','PARENT','ADMIN'].includes(r) ? r : 'STUDENT';
        })();
        await tx.organizationMember.upsert({
          where: { organizationId_userId: { organizationId, userId: user.id } },
          update: {},
          create: { organizationId, userId: user.id, roleInOrg: mappedOrgRole },
        });
      }
      return user as RepoUser;
    });
  },

  async updateUser(params: { id: string; fullname?: string; email?: string; globalRole?: GlobalUserRole; disable?: boolean }) {
    const { id, fullname, email, globalRole } = params;
    const data: { fullname?: string; email?: string; role?: GlobalUserRole } = {};
    if (fullname !== undefined) data.fullname = fullname;
    if (email !== undefined) data.email = email;
    if (globalRole !== undefined) {
      data.role = globalRole;
    }
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


