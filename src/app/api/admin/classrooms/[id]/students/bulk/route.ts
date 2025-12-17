import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { auditRepo } from "@/lib/repositories/audit-repo";
import { errorResponse } from "@/lib/api-utils";
import bcrypt from "bcryptjs";
import { userRepo } from "@/lib/repositories/user-repo";
import type { UserRole } from "@prisma/client";
import { passwordSchema } from "@/lib/validation/password.schema";

const requestSchema = z
  .object({
    emails: z.array(z.string().min(1)).min(1).max(500).optional(),
    entries: z
      .array(
        z.object({
          email: z.string().min(1),
          fullname: z.string().max(200).optional().nullable(),
        })
      )
      .min(1)
      .max(500)
      .optional(),
    reason: z.string().max(500).optional(),
    createMissing: z.boolean().optional().default(false),
    defaultPassword: z.string().optional(),
  })
  .refine((v) => (Array.isArray(v.entries) && v.entries.length > 0) || (Array.isArray(v.emails) && v.emails.length > 0), {
    message: "entries hoặc emails là bắt buộc",
    path: ["entries"],
  });

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function guessFullnameFromEmail(email: string): string {
  const local = email.split("@")[0] || "student";
  const cleaned = local
    .replace(/[+].*$/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const title = cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 6)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .trim();

  return title || "Học sinh";
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return errorResponse(403, "Forbidden - Admins only");
    }

    const classroomId = ctx?.params?.id;
    if (!classroomId) {
      return errorResponse(400, "Missing classroom id");
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "Dữ liệu không hợp lệ", {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const reason = parsed.data.reason?.trim() || null;
    const createMissing = !!parsed.data.createMissing;
    const defaultPassword = (parsed.data.defaultPassword || "").toString();

    if (createMissing) {
      const passwordParsed = passwordSchema.safeParse(defaultPassword);
      if (!passwordParsed.success) {
        return errorResponse(400, "Mật khẩu mặc định không hợp lệ.", {
          details: passwordParsed.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
    }
    const entries = Array.isArray(parsed.data.entries)
      ? parsed.data.entries
      : (parsed.data.emails || []).map((email) => ({ email, fullname: null }));

    const fullnameByEmail = new Map<string, string>();
    const emailList = Array.from(
      new Set(
        entries
          .map((e) => {
            const email = normalizeEmail(String(e?.email || ""));
            const fullname = (e?.fullname ?? "").toString().trim();
            if (email && fullname && !fullnameByEmail.has(email)) {
              fullnameByEmail.set(email, fullname);
            }
            return email;
          })
          .filter(Boolean)
      )
    ).slice(0, 500);

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, code: true, organizationId: true, isActive: true },
    });

    if (!classroom) {
      return errorResponse(404, "Classroom not found");
    }

    if (!classroom.isActive) {
      return errorResponse(409, "Lớp đã được lưu trữ. Vui lòng khôi phục để thao tác.");
    }

    const users = await prisma.user.findMany({
      where: { email: { in: emailList } },
      select: { id: true, email: true, role: true, fullname: true },
    });

    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const created: { email: string; studentId: string }[] = [];
    const accountsCreated: { email: string; studentId: string }[] = [];
    const skipped: { email: string; reason: string }[] = [];

    const existingStudentIds = users
      .filter((u) => String(u.role) === "STUDENT")
      .map((u) => u.id);
    const existingLinks = existingStudentIds.length
      ? await prisma.classroomStudent.findMany({
          where: { classroomId, studentId: { in: existingStudentIds } },
          select: { studentId: true },
        })
      : [];
    const alreadyInClassroomSet = new Set(existingLinks.map((r) => r.studentId));
    let alreadyInClassroom = 0;

    for (const email of emailList) {
      let u = byEmail.get(email);

      if (!u && createMissing) {
        try {
          const passwordHash = await bcrypt.hash(defaultPassword, 10);
          const preferredName = fullnameByEmail.get(email);
          const newUser = await userRepo.createUser({
            email,
            fullname: preferredName || guessFullnameFromEmail(email),
            passwordHash,
            globalRole: "STUDENT",
            organizationId: classroom.organizationId || null,
          });

          const createdRecord: {
            id: string;
            email: string;
            role: UserRole;
            fullname: string;
          } = {
            id: newUser.id,
            email: newUser.email,
            role: "STUDENT" as UserRole,
            fullname: newUser.fullname || guessFullnameFromEmail(email),
          };

          u = createdRecord;
          byEmail.set(email, createdRecord);
          accountsCreated.push({ email, studentId: createdRecord.id });
        } catch (e: unknown) {
          const reason =
            !!e &&
            typeof e === "object" &&
            "code" in e &&
            (e as { code?: unknown }).code === "P2002"
              ? "Email đã tồn tại"
              : "Không thể tạo tài khoản";
          skipped.push({ email, reason });
          continue;
        }
      }

      if (!u) {
        skipped.push({ email, reason: "User not found" });
        continue;
      }

      if (String(u.role) !== "STUDENT") {
        skipped.push({ email, reason: "User is not a STUDENT" });
        continue;
      }

      if (alreadyInClassroomSet.has(u.id)) {
        skipped.push({ email, reason: "Đã có trong lớp" });
        alreadyInClassroom += 1;
        continue;
      }

      try {
        await prisma.classroomStudent.upsert({
          where: { classroomId_studentId: { classroomId, studentId: u.id } },
          update: {},
          create: { classroomId, studentId: u.id },
        });
        alreadyInClassroomSet.add(u.id);
        created.push({ email, studentId: u.id });
      } catch {
        skipped.push({ email, reason: "Failed to add" });
      }
    }

    try {
      await auditRepo.write({
        actorId: session.user.id,
        actorRole: "ADMIN",
        action: "CLASSROOM_ADD_STUDENTS_BULK",
        entityType: "CLASSROOM",
        entityId: classroomId,
        organizationId: classroom.organizationId || null,
        metadata: {
          reason,
          classroomCode: classroom.code,
          classroomName: classroom.name,
          totalInput: emailList.length,
          added: created.length,
          accountsCreated: accountsCreated.length,
          createMissing,
          alreadyInClassroom,
          skipped: skipped.length,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        created,
        accountsCreated,
        alreadyInClassroom,
        skipped,
      },
    });
  } catch (error) {
    console.error("[API /api/admin/classrooms/[id]/students/bulk] Error", error);
    return errorResponse(500, "Internal server error");
  }
}
