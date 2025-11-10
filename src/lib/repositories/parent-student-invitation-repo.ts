import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateInvitationCode } from "@/lib/utils/code-generator";

/**
 * Repository cho ParentStudentInvitation
 * Quản lý lời mời từ học sinh cho phụ huynh
 */

export type Paginated<T> = {
  items: T[];
  total: number;
};

export const parentStudentInvitationRepo = {
  /**
   * Tạo invitation code mới
   * @param studentId - ID của học sinh tạo invitation
   * @param parentEmail - Email của phụ huynh (optional)
   * @param parentPhone - SĐT của phụ huynh (optional)
   * @param expiresInDays - Số ngày hết hạn (mặc định 7)
   */
  async create(params: {
    studentId: string;
    expiresInDays?: number;
  }) {
    const { studentId, expiresInDays = 7 } = params;

    try {
      // Validate student role
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { role: true, fullname: true, email: true },
      });

      if (!student || student.role !== "STUDENT") {
        throw new Error("Only students can create invitations");
      }

      // Tạo mã invitation duy nhất
      let code = generateInvitationCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await prisma.parentStudentInvitation.findUnique({
          where: { code },
        });

        if (!existing) break;
        code = generateInvitationCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Failed to generate unique invitation code");
      }

      // Tính thời gian hết hạn
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      return await prisma.parentStudentInvitation.create({
        data: {
          code,
          studentId,
          expiresAt,
        },
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
      });
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.create] Error:", error);
      throw error;
    }
  },

  /**
   * Lấy invitation theo code
   */
  async getByCode(code: string) {
    try {
      return await prisma.parentStudentInvitation.findUnique({
        where: { code },
        include: {
          student: {
            select: {
              id: true,
              email: true,
              fullname: true,
              role: true,
            },
          },
          parent: {
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
      console.error("[parentStudentInvitationRepo.getByCode] Error:", error);
      throw error;
    }
  },

  /**
   * Validate invitation code
   * Kiểm tra code có hợp lệ, chưa hết hạn, chưa được sử dụng
   */
  async validateCode(code: string) {
    try {
      const invitation = await this.getByCode(code);

      if (!invitation) {
        return { valid: false, error: "Invitation code not found" };
      }

      if (invitation.status !== "PENDING") {
        return { valid: false, error: "Invitation already used or expired" };
      }

      if (new Date() > invitation.expiresAt) {
        // Tự động cập nhật trạng thái EXPIRED
        await prisma.parentStudentInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        return { valid: false, error: "Invitation code has expired" };
      }

      if (invitation.usedAt) {
        return { valid: false, error: "Invitation code already used" };
      }

      return { valid: true, invitation };
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.validateCode] Error:", error);
      throw error;
    }
  },

  /**
   * Phụ huynh accept invitation
   * Tạo liên kết ParentStudent và cập nhật invitation
   */
  async acceptInvitation(params: { code: string; parentId: string }) {
    const { code, parentId } = params;

    try {
      // Validate parent role
      const parent = await prisma.user.findUnique({
        where: { id: parentId },
        select: { role: true },
      });

      if (!parent || parent.role !== "PARENT") {
        throw new Error("Only parents can accept invitations");
      }

      // Validate invitation
      const validation = await this.validateCode(code);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const invitation = validation.invitation!;

      // Kiểm tra xem liên kết đã tồn tại chưa
      const existingLink = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId,
            studentId: invitation.studentId,
          },
        },
      });

      if (existingLink) {
        throw new Error("Link already exists between parent and student");
      }

      // Tạo liên kết và cập nhật invitation trong transaction
      return await prisma.$transaction(async (tx) => {
        // Cập nhật invitation
        await tx.parentStudentInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "APPROVED",
            parentId,
            usedAt: new Date(),
          },
        });

        // Tạo liên kết
        const link = await tx.parentStudent.create({
          data: {
            parentId,
            studentId: invitation.studentId,
            status: "ACTIVE",
            initiatedBy: invitation.studentId,
            parentConfirmedAt: new Date(),
            studentConfirmedAt: new Date(), // Học sinh đã confirm bằng cách tạo invitation
            metadata: {
              source: "invitation",
              invitationCode: code,
              acceptedAt: new Date().toISOString(),
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

        return { link, invitation };
      });
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.acceptInvitation] Error:", error);
      throw error;
    }
  },

  /**
   * Lấy danh sách invitations của học sinh
   */
  async listByStudent(params: {
    studentId: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
    limit?: number;
    skip?: number;
  }): Promise<Paginated<any>> {
    const { studentId, status, limit = 20, skip = 0 } = params;

    try {
      const where: Prisma.ParentStudentInvitationWhereInput = {
        studentId,
      };

      if (status) {
        where.status = status;
      }

      const [items, total] = await Promise.all([
        prisma.parentStudentInvitation.findMany({
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
        prisma.parentStudentInvitation.count({ where }),
      ]);

      return { items, total };
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.listByStudent] Error:", error);
      throw error;
    }
  },

  /**
   * Hủy invitation
   */
  async cancel(params: { id: string; studentId: string }) {
    const { id, studentId } = params;

    try {
      const invitation = await prisma.parentStudentInvitation.findUnique({
        where: { id },
      });

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      if (invitation.studentId !== studentId) {
        throw new Error("Unauthorized: You can only cancel your own invitations");
      }

      if (invitation.status !== "PENDING") {
        throw new Error("Can only cancel pending invitations");
      }

      return await prisma.parentStudentInvitation.update({
        where: { id },
        data: { status: "REJECTED" },
      });
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.cancel] Error:", error);
      throw error;
    }
  },

  /**
   * Tự động expire các invitations hết hạn
   * Nên chạy bằng cron job
   */
  async expireOldInvitations() {
    try {
      const result = await prisma.parentStudentInvitation.updateMany({
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

      console.log(`[parentStudentInvitationRepo.expireOldInvitations] Expired ${result.count} invitations`);
      return result.count;
    } catch (error: any) {
      console.error("[parentStudentInvitationRepo.expireOldInvitations] Error:", error);
      throw error;
    }
  },
};
