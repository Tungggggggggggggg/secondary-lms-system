/*
  Warnings:

  - You are about to drop the `message_reactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "message_reactions" DROP CONSTRAINT "message_reactions_messageId_fkey";

-- DropForeignKey
ALTER TABLE "message_reactions" DROP CONSTRAINT "message_reactions_userId_fkey";

-- DropIndex
DROP INDEX "announcements_classroomId_createdAt_idx";

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "message_reactions";

-- CreateIndex
CREATE INDEX "announcements_classroomId_pinnedAt_createdAt_idx" ON "announcements"("classroomId", "pinnedAt", "createdAt");
