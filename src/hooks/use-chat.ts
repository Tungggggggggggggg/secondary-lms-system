import useSWR from "swr";

export type ConversationItem = {
  id: string;
  type: "DM" | "TRIAD" | "GROUP";
  createdAt: string;
  classId?: string | null;
  contextStudentId?: string | null;
  lastMessage?: { id: string; content: string; createdAt: string; senderId: string } | null;
  participants: Array<{ userId: string; fullname: string; role: string }>;
  self: { userId: string; lastReadAt?: string | null };
  unreadCount: number;
};

export type ChatAttachmentDTO = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
};

export type MessageDTO = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullname: string; role: string };
  attachments?: ChatAttachmentDTO[];
  parentId?: string | null;
  parentMessage?: { content: string; sender: { fullname: string } } | null;
  };

export function useConversations() {
  const { data, error, isLoading, mutate } = useSWR<{ success?: boolean; data?: unknown }>("/api/chat/conversations", {
    refreshInterval: 30000,
    dedupingInterval: 45000,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  return {
    conversations: (data?.data || []) as ConversationItem[],
    isLoading,
    error: error ? String(error) : null,
    refresh: mutate,
  };
}

export function useMessages(conversationId?: string) {
  const key = conversationId ? `/api/chat/messages?conversationId=${encodeURIComponent(conversationId)}` : null;
  const { data, error, isLoading, mutate } = useSWR<{ success?: boolean; data?: unknown }>(key, {
    refreshInterval: 10000,
    dedupingInterval: 15000,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  return {
    messages: (data?.data || []) as MessageDTO[],
    isLoading,
    error: error ? String(error) : null,
    refresh: mutate,
  };
}

export async function sendMessage(
  conversationId: string,
  content: string,
  attachments?: { name: string; mimeType: string; sizeBytes: number; storagePath: string }[],
  parentId?: string
) {
  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, content, attachments: attachments || [], parentId }),
  });
  return res.json();
}

export async function markRead(conversationId: string) {
  await fetch("/api/chat/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
}


export function useUnreadTotal() {
  const { data } = useSWR<{ total?: unknown }>("/api/chat/unread-total", {
    refreshInterval: 60000,
    dedupingInterval: 45000,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });
  return (data?.total as number) || 0;
}

export async function createConversationFromTeacher(studentId: string, includeParents = true, classId?: string) {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, includeParents, classId: classId || null }),
  });
  return res.json();
}

export async function createConversationGeneric(participantIds: string[], classId?: string, contextStudentId?: string) {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantIds, classId: classId || null, contextStudentId: contextStudentId || null }),
  });
  return res.json();
}
