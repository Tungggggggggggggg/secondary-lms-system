export type ChatParticipant = {
  userId: string;
  fullname: string;
  role: string;
};

export type ConversationListItem = {
  id: string;
  type: "DM" | "TRIAD" | "GROUP";
  createdAt: string;
  classId?: string | null;
  contextStudentId?: string | null;
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  participants: ChatParticipant[];
  self: {
    userId: string;
    lastReadAt?: string | null;
  };
};

export type MessageDTO = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
};
