import { prisma } from "@/lib/prisma";

export type Paginated<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
};

// Repository cho ParentStudent phục vụ trang Admin
export const parentStudentRepo = {
  async list(params?: {
    search?: string | null;
    limit?: number;
    skip?: number;
    parentId?: string | null;
    studentId?: string | null;
  }) {
    const { search, limit = 20, skip = 0, parentId, studentId } = params || {};
    const where: any = {};

    if (parentId) {
      where.parentId = parentId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (search) {
      where.OR = [
        { parent: { fullname: { contains: search, mode: "insensitive" } } },
        { parent: { email: { contains: search, mode: "insensitive" } } },
        { student: { fullname: { contains: search, mode: "insensitive" } } },
        { student: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.parentStudent.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: "desc" },
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              fullname: true,
              role: true,
            },
          },
          student: {
            select: {
              id: true,
              email: true,
              fullname: true,
              role: true,
            },
          },
        },
      }),
      prisma.parentStudent.count({ where }),
    ]);

    return { items, total } as Paginated<typeof items[number]>;
  },

  async getById(id: string) {
    return prisma.parentStudent.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
    });
  },

  async create(params: { parentId: string; studentId: string }) {
    const { parentId, studentId } = params;

    // Validate parent role
    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { role: true },
    });

    if (!parent || parent.role !== "PARENT") {
      throw new Error("Parent must have role PARENT");
    }

    // Validate student role
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });

    if (!student || student.role !== "STUDENT") {
      throw new Error("Student must have role STUDENT");
    }

    // Check if relationship already exists
    const existing = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (existing) {
      throw new Error("Parent-student relationship already exists");
    }

    return prisma.parentStudent.create({
      data: {
        parentId,
        studentId,
      },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
    });
  },

  async update(id: string, params: { parentId?: string; studentId?: string }) {
    const { parentId, studentId } = params;

    // Get existing relationship
    const existing = await prisma.parentStudent.findUnique({
      where: { id },
      select: { parentId: true, studentId: true },
    });

    if (!existing) {
      throw new Error("Parent-student relationship not found");
    }

    // Use existing values if not provided
    const newParentId = parentId || existing.parentId;
    const newStudentId = studentId || existing.studentId;

    // Validate if values changed
    if (newParentId === existing.parentId && newStudentId === existing.studentId) {
      // No changes, return existing relationship
      return this.getById(id);
    }

    // Validate parent role if parentId changed
    if (parentId && parentId !== existing.parentId) {
      const parent = await prisma.user.findUnique({
        where: { id: parentId },
        select: { role: true },
      });

      if (!parent || parent.role !== "PARENT") {
        throw new Error("Parent must have role PARENT");
      }
    }

    // Validate student role if studentId changed
    if (studentId && studentId !== existing.studentId) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });

      if (!student || student.role !== "STUDENT") {
        throw new Error("Student must have role STUDENT");
      }
    }

    // Check if new relationship already exists (and it's not the same one)
    const duplicate = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: newParentId,
          studentId: newStudentId,
        },
      },
    });

    if (duplicate && duplicate.id !== id) {
      throw new Error("Parent-student relationship already exists");
    }

    // Update in transaction: delete old and create new
    // Note: Since parentId and studentId are part of unique constraint,
    // we need to delete and recreate, or use a different approach
    // For simplicity, we'll delete and create in a transaction
    return prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.parentStudent.delete({
        where: { id },
      });

      // Create new with updated values
      return tx.parentStudent.create({
        data: {
          parentId: newParentId,
          studentId: newStudentId,
        },
        include: {
          parent: {
            select: {
              id: true,
              email: true,
              fullname: true,
              role: true,
            },
          },
          student: {
            select: {
              id: true,
              email: true,
              fullname: true,
              role: true,
            },
          },
        },
      });
    });
  },

  async delete(id: string) {
    return prisma.parentStudent.delete({
      where: { id },
    });
  },

  async getByParentId(parentId: string) {
    return prisma.parentStudent.findMany({
      where: { parentId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getByStudentId(studentId: string) {
    return prisma.parentStudent.findMany({
      where: { studentId },
      include: {
        parent: {
          select: {
            id: true,
            email: true,
            fullname: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};

