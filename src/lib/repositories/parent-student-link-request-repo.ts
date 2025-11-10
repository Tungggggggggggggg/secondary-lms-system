import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Repository cho ParentStudentLinkRequest
 * Quản lý yêu cầu liên kết từ phụ huynh đến học sinh
 */

export type Paginated<T> = {
  items: T[];
  total: number;
};

export const parentStudentLinkRequestRepo = {
  /**
   * Tạo link request mới từ phụ huynh
   * @param parentId - ID của phụ huynh
   * @param studentId - ID của học sinh
   * @param message - Lời nhắn từ phụ huynh (optional)
   * @param expiresInDays - Số ngày hết hạn (mặc định 30)
   */
  async create(params: {
    parentId: string;
    studentId: string;
    message?: string;
    expiresInDays?: number;
  }) {
    const { parentId, studentId, message, expiresInDays = 30 } = params;

    try {
      // Validate parent role
      const parent = await prisma.user.findUnique({
        where: { id: parentId },
        select: { role: true },
      });

      if (!parent || parent.role !== "PARENT") {
        throw new Error("Only parents can create link requests");
      }

      // Validate student role
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { role: true },
      });

      if (!student || student.role !== "STUDENT") {
        throw new Error("Target user must be a student");
      }

      // Kiểm tra xem đã có link chưa
      const existingLink = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
      });

      if (existingLink) {
        throw new Error("Link already exists between parent and student");
      }

      // Kiểm tra xem đã có request pending chưa
      const existingRequest = await prisma.parentStudentLinkRequest.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId,
          },
        },
      });

      if (existingRequest && existingRequest.status === "PENDING") {
        throw new Error("A pending request already exists");
      }

      // Nếu có request cũ đã expired/rejected, xóa đi
      if (existingRequest) {
        await prisma.parentStudentLinkRequest.delete({
          where: { id: existingRequest.id },
        });
      }

      // Tính thời gian hết hạn
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      return await prisma.parentStudentLinkRequest.create({
        data: {
          parentId,
          studentId,
          message,
          expiresAt,
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
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.create] Error:", error);
      throw error;
    }
  },

  /**
   * Lấy request theo ID
   */
  async getById(id: string) {
    try {
      return await prisma.parentStudentLinkRequest.findUnique({
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
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.getById] Error:", error);
      throw error;
    }
  },

  /**
   * Học sinh approve request
   */
  async approve(params: { requestId: string; studentId: string }) {
    const { requestId, studentId } = params;

    try {
      const request = await this.getById(requestId);

      if (!request) {
        throw new Error("Request not found");
      }

      if (request.studentId !== studentId) {
        throw new Error("Unauthorized: You can only approve requests sent to you");
      }

      if (request.status !== "PENDING") {
        throw new Error("Request is not pending");
      }

      if (new Date() > request.expiresAt) {
        await prisma.parentStudentLinkRequest.update({
          where: { id: requestId },
          data: { status: "EXPIRED" },
        });
        throw new Error("Request has expired");
      }

      // Kiểm tra xem đã có link chưa
      const existingLink = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: request.parentId,
            studentId: request.studentId,
          },
        },
      });

      if (existingLink) {
        throw new Error("Link already exists");
      }

      // Approve request và tạo link trong transaction
      return await prisma.$transaction(async (tx) => {
        // Cập nhật request
        await tx.parentStudentLinkRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            respondedAt: new Date(),
          },
        });

        // Tạo liên kết
        const link = await tx.parentStudent.create({
          data: {
            parentId: request.parentId,
            studentId: request.studentId,
            status: "ACTIVE",
            initiatedBy: request.parentId,
            parentConfirmedAt: new Date(), // Parent đã confirm bằng cách tạo request
            studentConfirmedAt: new Date(),
            metadata: {
              source: "link_request",
              requestId,
              approvedAt: new Date().toISOString(),
            },
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

        return { link, request };
      });
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.approve] Error:", error);
      throw error;
    }
  },

  /**
   * Học sinh reject request
   */
  async reject(params: { requestId: string; studentId: string; reason?: string }) {
    const { requestId, studentId, reason } = params;

    try {
      const request = await this.getById(requestId);

      if (!request) {
        throw new Error("Request not found");
      }

      if (request.studentId !== studentId) {
        throw new Error("Unauthorized: You can only reject requests sent to you");
      }

      if (request.status !== "PENDING") {
        throw new Error("Request is not pending");
      }

      return await prisma.parentStudentLinkRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          respondedAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.reject] Error:", error);
      throw error;
    }
  },

  /**
   * Phụ huynh hủy request
   */
  async cancel(params: { requestId: string; parentId: string }) {
    const { requestId, parentId } = params;

    try {
      const request = await this.getById(requestId);

      if (!request) {
        throw new Error("Request not found");
      }

      if (request.parentId !== parentId) {
        throw new Error("Unauthorized: You can only cancel your own requests");
      }

      if (request.status !== "PENDING") {
        throw new Error("Can only cancel pending requests");
      }

      return await prisma.parentStudentLinkRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.cancel] Error:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách requests của phụ huynh (đã gửi)
   */
  async listByParent(params: {
    parentId: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
    limit?: number;
    skip?: number;
  }): Promise<Paginated<any>> {
    const { parentId, status, limit = 20, skip = 0 } = params;

    try {
      // CRITICAL FIX: Check if model exists (Prisma Client might not be generated yet)
      if (!(prisma as any).parentStudentLinkRequest) {
        console.error("[parentStudentLinkRequestRepo.listByParent] ERROR: Prisma Client not generated! Run: npx prisma generate");
        throw new Error("Database model not available. Please run: npx prisma generate");
      }

      const where: Prisma.ParentStudentLinkRequestWhereInput = {
        parentId,
      };

      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.parentStudentLinkRequest.findMany({
          where,
          take: limit,
          skip,
          orderBy: { createdAt: "desc" },
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
        }),
        prisma.parentStudentLinkRequest.count({ where }),
      ]);

      return { items, total };
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.listByParent] Error:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách requests của học sinh (đã nhận)
   */
  async listByStudent(params: {
    studentId: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
    limit?: number;
    skip?: number;
  }): Promise<Paginated<any>> {
    const { studentId, status, limit = 20, skip = 0 } = params;

    try {
      const where: Prisma.ParentStudentLinkRequestWhereInput = {
        studentId,
      };

      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.parentStudentLinkRequest.findMany({
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
          },
        }),
        prisma.parentStudentLinkRequest.count({ where }),
      ]);

      return { items, total };
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.listByStudent] Error:", error);
      throw error;
    }
  },

  /**
   * Tự động expire các requests hết hạn
   * Nên chạy bằng cron job
   */
  async expireOldRequests() {
    try {
      const result = await prisma.parentStudentLinkRequest.updateMany({
        where: {
          status: "PENDING",
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: "EXPIRED",
        },
      });

      console.log(`[parentStudentLinkRequestRepo.expireOldRequests] Expired ${result.count} requests`);
      return result.count;
    } catch (error: any) {
      console.error("[parentStudentLinkRequestRepo.expireOldRequests] Error:", error);
      throw error;
    }
  },
};
