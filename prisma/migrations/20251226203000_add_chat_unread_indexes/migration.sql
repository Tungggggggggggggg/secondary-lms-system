CREATE INDEX IF NOT EXISTS "conversation_participants_userId_conversationId_lastReadAt_idx" ON "conversation_participants"("userId", "conversationId", "lastReadAt");

CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
