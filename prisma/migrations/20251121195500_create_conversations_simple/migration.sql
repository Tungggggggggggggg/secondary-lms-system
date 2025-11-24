-- Ensure ConversationType enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationType') THEN
    CREATE TYPE "ConversationType" AS ENUM ('DM','TRIAD','GROUP');
  END IF;
END$$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" TEXT PRIMARY KEY,
  "type" "ConversationType" NOT NULL DEFAULT 'DM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "classId" TEXT,
  "contextStudentId" TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS "conversations_createdAt_idx" ON "conversations" ("createdAt");
CREATE INDEX IF NOT EXISTS "conversations_classId_idx" ON "conversations" ("classId");
CREATE INDEX IF NOT EXISTS "conversations_contextStudentId_idx" ON "conversations" ("contextStudentId");

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_createdById_fkey'
  ) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_classId_fkey'
  ) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_contextStudentId_fkey'
  ) THEN
    ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contextStudentId_fkey" FOREIGN KEY ("contextStudentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleInConv" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversationId_userId_key" ON "conversation_participants" ("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "conversation_participants_userId_idx" ON "conversation_participants" ("userId");

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversation_participants_conversationId_fkey'
  ) THEN
    ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversation_participants_userId_fkey'
  ) THEN
    ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
