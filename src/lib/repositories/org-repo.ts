import { prisma } from "@/lib/prisma";

export const orgRepo = {
  async list(params?: { search?: string | null; limit?: number; cursor?: string | null }) {
    const { search, limit = 20, cursor } = params || {};
    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };
    const items = await prisma.organization.findMany({
      where,
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    });
    let nextCursor: string | null = null;
    if (items.length > limit) {
      const last = items.pop()!;
      nextCursor = last.id;
    }
    return { items, nextCursor };
  },

  async getById(id: string) {
    return prisma.organization.findUnique({ where: { id }, select: { id: true, name: true, createdAt: true } });
  },

  async create(params: { name: string; slug?: string | null }) {
    const { name } = params;
    return prisma.organization.create({ data: { name }, select: { id: true, name: true } });
  },

  async update(id: string, data: { name?: string; slug?: string | null; status?: "ACTIVE" | "INACTIVE" }) {
    // Chỉ cập nhật các trường tương thích với Prisma client hiện tại
    const { name } = data;
    return prisma.organization.update({ where: { id }, data: { name } as any, select: { id: true, name: true } });
  },
};


