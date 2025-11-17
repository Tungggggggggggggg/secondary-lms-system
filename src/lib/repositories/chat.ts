import prisma from "@/lib/prisma";

// Kiểu enum nội bộ (trùng với Prisma enum) để tránh lỗi khi chưa prisma generate
export type ConversationType = "DM" | "TRIAD" | "GROUP";

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  createdAt: string;
  classId?: string | null;
  contextStudentId?: string | null;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  participants: Array<{
    userId: string;
    fullname: string;
    role: string;
  }>
  self: {
    userId: string;
    lastReadAt?: string | null;
  };
  unreadCount: number;
};

export async function getParentIdsOfStudent(studentId: string): Promise<string[]> {
  const links = await prisma.parentStudent.findMany({
    where: { studentId, status: "ACTIVE" },
    select: { parentId: true },
  });
  return links.map((x) => x.parentId);
}

export async function isTeacherOfStudent(teacherId: string, studentId: string): Promise<{ ok: boolean; classIds: string[] }>{
  const memberships = await prisma.classroomStudent.findMany({
    where: {
      studentId,
      classroom: { teacherId },
    },
    select: { classroomId: true },
  });
  return { ok: memberships.length > 0, classIds: memberships.map((m) => m.classroomId) };
}

// Kiểm tra user có là participant của cuộc trò chuyện không
export async function isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
  const prismaAny = prisma as any;
  const cp = await prismaAny.conversationParticipant.findFirst({
    where: { conversationId, userId },
    select: { id: true },
  });
  return !!cp;
}

export async function listConversations(userId: string): Promise<ConversationListItem[]> {
  const prismaAny = prisma as any;
  const cps = await prismaAny.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: { id: true, fullname: true, role: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const items = await Promise.all(
    cps.map(async (cp: any) => {
      const lastReadAt: Date = cp.lastReadAt ?? new Date(0);
      const unreadCount = await prismaAny.message.count({
        where: {
          conversationId: cp.conversationId,
          createdAt: { gt: lastReadAt },
          NOT: { senderId: userId },
        },
      });
      return {
        id: cp.conversation.id,
        type: cp.conversation.type,
        createdAt: cp.conversation.createdAt.toISOString(),
        classId: cp.conversation.classId,
        contextStudentId: cp.conversation.contextStudentId,
        lastMessage: cp.conversation.messages[0]
          ? {
              id: cp.conversation.messages[0].id,
              content: cp.conversation.messages[0].content,
              createdAt: cp.conversation.messages[0].createdAt.toISOString(),
              senderId: cp.conversation.messages[0].senderId,
            }
          : null,
        participants: cp.conversation.participants.map((p: any) => ({
          userId: p.userId,
          fullname: p.user.fullname,
          role: p.user.role,
        })),
        self: { userId, lastReadAt: cp.lastReadAt?.toISOString() ?? null },
        unreadCount,
      } as ConversationListItem;
    })
  );
  return items;
}

export async function findReusableConversation(params: {
  type: ConversationType;
  participantIds: string[];
  contextStudentId?: string | null;
}): Promise<string | null> {
  const { type, participantIds, contextStudentId } = params;
  if (participantIds.length === 0) return null;

  const prismaAny = prisma as any;
  const candidates = await prismaAny.conversation.findMany({
    where: {
      type,
      contextStudentId: contextStudentId ?? null,
      AND: participantIds.map((uid) => ({ participants: { some: { userId: uid } } })),
    },
    include: { participants: true },
    take: 10,
  });

  for (const c of candidates as any[]) {
    const ids = c.participants.map((p: any) => p.userId).sort();
    const target = [...participantIds].sort();
    if (ids.length === target.length && ids.every((v: string, i: number) => v === target[i])) {
      return c.id;
    }
  }
  return null;
}

export async function createConversation(params: {
  type: ConversationType;
  createdById: string;
  participantIds: string[];
  classId?: string | null;
  contextStudentId?: string | null;
}): Promise<string> {
  const { type, createdById, participantIds, classId, contextStudentId } = params;

  const reused = await findReusableConversation({ type, participantIds, contextStudentId });
  if (reused) return reused;

  const prismaAny = prisma as any;
  const conv = await prismaAny.conversation.create({
    data: {
      type,
      createdById,
      classId: classId ?? null,
      contextStudentId: contextStudentId ?? null,
      participants: {
        create: participantIds.map((uid) => ({ userId: uid })),
      },
    },
    select: { id: true },
  });
  return conv.id;
}

export async function ensureTeacherStudentConversation(params: {
  teacherId: string;
  studentId: string;
  includeParents?: boolean;
  classId?: string | null;
}): Promise<string> {
  const { teacherId, studentId, includeParents, classId } = params;
  const rel = await isTeacherOfStudent(teacherId, studentId);
  if (!rel.ok) throw new Error("Teacher không phụ trách học sinh này");

  const parents = includeParents ? await getParentIdsOfStudent(studentId) : [];
  const participantIds = Array.from(new Set([teacherId, studentId, ...parents]));
  const type: ConversationType = includeParents && parents.length > 0 ? "TRIAD" : "DM";
  const id = await createConversation({
    type,
    createdById: teacherId,
    participantIds,
    classId: classId ?? rel.classIds[0] ?? null,
    contextStudentId: studentId,
  });
  return id;
}

export async function listMessages(conversationId: string, limit = 50): Promise<Array<{ id: string; content: string; createdAt: string; senderId: string }>> {
  const prismaAny = prisma as any;
  const messages = await prismaAny.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, content: true, createdAt: true, senderId: true },
  });
  return (messages as any[]).map((m: any) => ({ id: m.id, content: m.content, createdAt: m.createdAt.toISOString(), senderId: m.senderId }));
}

export async function addMessage(conversationId: string, senderId: string, content: string) {
  const prismaAny = prisma as any;
  const msg = await prismaAny.message.create({
    data: { conversationId, senderId, content },
    select: { id: true, content: true, createdAt: true, senderId: true },
  });
  await prismaAny.conversationParticipant.updateMany({
    where: { conversationId, userId: senderId },
    data: { lastReadAt: new Date() },
  });
  return { id: msg.id, content: msg.content, createdAt: (msg.createdAt as Date).toISOString(), senderId: msg.senderId };
}

export async function markRead(conversationId: string, userId: string) {
  const prismaAny = prisma as any;
  await prismaAny.conversationParticipant.updateMany({ where: { conversationId, userId }, data: { lastReadAt: new Date() } });
}

export async function totalUnreadCount(userId: string): Promise<number> {
  const prismaAny = prisma as any;
  const cps = await prismaAny.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
  let total = 0;
  for (const cp of cps as any[]) {
    const c = await prismaAny.message.count({
      where: {
        conversationId: cp.conversationId,
        createdAt: { gt: cp.lastReadAt ?? new Date(0) },
        NOT: { senderId: userId },
      },
    });
    total += c;
  }
  return total;
}
