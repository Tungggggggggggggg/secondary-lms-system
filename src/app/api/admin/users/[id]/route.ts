import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { settingsRepo } from "@/lib/repositories/settings-repo";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const paramsSchema = z.object({
  id: z.string().min(1),
});

const CREATABLE_ROLES = ["TEACHER", "STUDENT", "PARENT"] as const;

function normalizeRole(value: unknown): (typeof CREATABLE_ROLES)[number] | null {
  const raw = (value ?? "").toString().trim().toUpperCase();
  return (CREATABLE_ROLES as readonly string[]).includes(raw) ? (raw as (typeof CREATABLE_ROLES)[number]) : null;
}

const patchSchema = z.object({
  fullname: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
  role: z.string().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing user id");
    }
    const userId = parsedParams.data.id;

    const body = await req.json().catch(() => null);
    const parsedBody = patchSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(400, "Invalid payload");
    }

    const payload = parsedBody.data;
    const nextRole = payload.role !== undefined ? normalizeRole(payload.role) : undefined;

    if (payload.role !== undefined && !nextRole) {
      return errorResponse(400, "Vai trò không hợp lệ. Chỉ hỗ trợ TEACHER, STUDENT, PARENT.");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullname: true, role: true, roleSelectedAt: true },
    });

    if (!target) {
      return errorResponse(404, "User not found");
    }

    if (String(target.role) === "ADMIN") {
      return errorResponse(400, "Không thể chỉnh sửa tài khoản ADMIN");
    }

    const updateData: { fullname?: string; email?: string; role?: any; roleSelectedAt?: Date } = {};

    if (typeof payload.fullname === "string") {
      updateData.fullname = payload.fullname;
    }

    if (typeof payload.email === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(payload.email)) {
        return errorResponse(400, "Email không hợp lệ.");
      }

      if (payload.email !== target.email.toLowerCase()) {
        const existing = await prisma.user.findUnique({ where: { email: payload.email } });
        if (existing && existing.id !== userId) {
          return errorResponse(409, "Email đã được sử dụng.");
        }
      }
      updateData.email = payload.email;
    }

    if (nextRole) {
      if (nextRole !== String(target.role)) {
        updateData.role = nextRole as any;
        updateData.roleSelectedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, data: { id: userId } }, { status: 200 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, fullname: true, role: true, roleSelectedAt: true, createdAt: true, updatedAt: true },
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "USER_UPDATE",
        entityType: "USER",
        entityId: userId,
        metadata: {
          before: { email: target.email, fullname: target.fullname, role: String(target.role) },
          after: { email: updated.email, fullname: updated.fullname, role: String(updated.role) },
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    console.error("[API /api/admin/users/[id] PATCH] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

/**
 * GET /api/admin/users/[id]
 *
 * Input:
 * - params.id: string
 *
 * Output:
 * - success true + user detail (kèm disabled state, org memberships, audit logs)
 *
 * Side effects:
 * - Read DB
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing user id");
    }

    const userId = parsedParams.data.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        roleSelectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse(404, "User not found");
    }

    const disabledSetting = await settingsRepo.get("disabled_users");
    let isDisabled = false;
    let disabledReason: string | null = null;

    if (Array.isArray(disabledSetting)) {
      for (const item of disabledSetting) {
        if (typeof item === "string" && item === userId) {
          isDisabled = true;
          break;
        }

        if (!isRecord(item)) continue;
        if (typeof item.id !== "string" || item.id !== userId) continue;

        isDisabled = true;
        disabledReason = typeof item.reason === "string" ? item.reason : null;
        break;
      }
    }

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        roleInOrg: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true,
          },
        },
      },
      take: 200,
    });

    const globalRole = String(user.role);

    const [teacherClassroomsList, studentClassroomsList, parentChildrenList, studentParentsList] = await Promise.all([
      globalRole === "TEACHER"
        ? prisma.classroom.findMany({
            where: { teacherId: userId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      globalRole === "STUDENT"
        ? prisma.classroomStudent.findMany({
            where: { studentId: userId },
            orderBy: { joinedAt: "desc" },
            take: 50,
            select: {
              id: true,
              joinedAt: true,
              classroom: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  isActive: true,
                  createdAt: true,
                  teacher: { select: { id: true, fullname: true, email: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      globalRole === "PARENT"
        ? prisma.parentStudent.findMany({
            where: { parentId: userId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              createdAt: true,
              status: true,
              student: { select: { id: true, fullname: true, email: true } },
            },
          })
        : Promise.resolve([]),
      globalRole === "STUDENT"
        ? prisma.parentStudent.findMany({
            where: { studentId: userId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              createdAt: true,
              status: true,
              parent: { select: { id: true, fullname: true, email: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const [teacherClassrooms, studentEnrollments, parentRelations] = await Promise.all([
      globalRole === "TEACHER" ? prisma.classroom.count({ where: { teacherId: userId } }) : Promise.resolve(0),
      globalRole === "STUDENT" ? prisma.classroomStudent.count({ where: { studentId: userId } }) : Promise.resolve(0),
      globalRole === "PARENT" ? prisma.parentStudent.count({ where: { parentId: userId } }) : Promise.resolve(0),
    ]);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ actorId: userId }, { entityType: "USER", entityId: userId }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorId: true,
        actorRole: true,
        organizationId: true,
        createdAt: true,
        ip: true,
        userAgent: true,
        metadata: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          isDisabled,
          disabledReason,
          stats: {
            teacherClassrooms,
            studentEnrollments,
            parentRelations,
          },
        },
        related: {
          teacherClassrooms: teacherClassroomsList,
          studentClassrooms: studentClassroomsList,
          parentChildren: parentChildrenList,
          studentParents: studentParentsList,
        },
        memberships,
        auditLogs,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/users/[id] GET] Error", error);
    return errorResponse(500, "Internal server error");
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const parsedParams = paramsSchema.safeParse(ctx?.params);
    if (!parsedParams.success) {
      return errorResponse(400, "Missing user id");
    }

    const userId = parsedParams.data.id;
    if (userId === session.user.id) {
      return errorResponse(400, "Không thể xóa chính tài khoản đang đăng nhập.");
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!target) {
      return errorResponse(404, "User not found");
    }

    if (String(target.role) === "ADMIN") {
      return errorResponse(400, "Không thể xóa tài khoản ADMIN");
    }

    const currentDisabled = await settingsRepo.get("disabled_users");
    const nextDisabled: unknown[] = Array.isArray(currentDisabled)
      ? currentDisabled.filter((item) => {
          if (typeof item === "string") return item !== userId;
          if (isRecord(item) && typeof item.id === "string") return item.id !== userId;
          return true;
        })
      : [];

    await prisma.$transaction(async (tx) => {
      await settingsRepo.set("disabled_users", nextDisabled);
      await tx.user.delete({ where: { id: userId } });
    });

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "USER_DELETE",
        entityType: "USER",
        entityId: userId,
        metadata: {
          targetEmail: target.email,
          targetRole: String(target.role),
        },
      });
    } catch {}

    return NextResponse.json({ success: true, data: { id: userId } }, { status: 200 });
  } catch (error: unknown) {
    const code =
      !!error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : null;

    if (code === "P2003") {
      return errorResponse(
        409,
        "Không thể xóa người dùng vì còn dữ liệu liên quan. Hãy dùng thao tác 'Khoá tài khoản' thay vì xoá.",
        { details: { code } }
      );
    }
    if (code === "P2025") {
      return errorResponse(404, "User not found", { details: { code } });
    }

    console.error("[API /api/admin/users/[id] DELETE] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
