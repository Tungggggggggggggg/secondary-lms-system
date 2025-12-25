/*
  Warnings:

  - You are about to drop the column `antiCheatConfig` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `autoSubmit` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDuration` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `fallbackConfig` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `timerType` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `warningMinutes` on the `assignments` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `difficulty` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `explanation` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `timeLimit` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `AutoSaveData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExamEventLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExamSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeacherIntervention` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AutoSaveData" DROP CONSTRAINT "AutoSaveData_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "ExamEventLog" DROP CONSTRAINT "ExamEventLog_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "ExamSession" DROP CONSTRAINT "ExamSession_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "ExamSession" DROP CONSTRAINT "ExamSession_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherIntervention" DROP CONSTRAINT "TeacherIntervention_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherIntervention" DROP CONSTRAINT "TeacherIntervention_teacherId_fkey";

-- DropIndex
DROP INDEX "assignments_authorId_type_createdAt_idx";

-- DropIndex
DROP INDEX "assignments_difficulty_idx";

-- DropIndex
DROP INDEX "assignments_timerType_idx";

-- DropIndex
DROP INDEX "idx_assignments_subject";

-- DropIndex
DROP INDEX "classrooms_teacherId_isActive_createdAt_idx";

-- DropIndex
DROP INDEX "questions_difficulty_idx";

-- DropIndex
DROP INDEX "questions_points_idx";

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "comments_locked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "assignments" DROP COLUMN "antiCheatConfig",
DROP COLUMN "autoSubmit",
DROP COLUMN "difficulty",
DROP COLUMN "durationMinutes",
DROP COLUMN "estimatedDuration",
DROP COLUMN "fallbackConfig",
DROP COLUMN "instructions",
DROP COLUMN "tags",
DROP COLUMN "timerType",
DROP COLUMN "warningMinutes",
ALTER COLUMN "subject" SET DATA TYPE TEXT,
ALTER COLUMN "submission_format" DROP DEFAULT,
ALTER COLUMN "max_attempts" DROP DEFAULT;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "attachments",
DROP COLUMN "difficulty",
DROP COLUMN "explanation",
DROP COLUMN "points",
DROP COLUMN "tags",
DROP COLUMN "timeLimit";

-- DropTable
DROP TABLE "AutoSaveData";

-- DropTable
DROP TABLE "ExamEventLog";

-- DropTable
DROP TABLE "ExamSession";

-- DropTable
DROP TABLE "TeacherIntervention";

-- CreateTable
CREATE TABLE "exam_events" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attempt" INTEGER,
    "eventType" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "exam_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_attempts" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "shuffleSeed" INTEGER NOT NULL,
    "antiCheatConfig" JSONB,
    "timeLimitMinutes" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" VARCHAR(20),

    CONSTRAINT "assignment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_events_assignmentId_createdAt_idx" ON "exam_events"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "exam_events_studentId_createdAt_idx" ON "exam_events"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "assignment_attempts_assignmentId_startedAt_idx" ON "assignment_attempts"("assignmentId", "startedAt");

-- CreateIndex
CREATE INDEX "assignment_attempts_studentId_startedAt_idx" ON "assignment_attempts"("studentId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_attempts_assignmentId_studentId_attemptNumber_key" ON "assignment_attempts"("assignmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "assignments_authorId_type_createdAt_idx" ON "assignments"("authorId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "classrooms_teacherId_isActive_createdAt_idx" ON "classrooms"("teacherId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "users_role_createdAt_idx" ON "users"("role", "createdAt");

-- AddForeignKey
ALTER TABLE "exam_events" ADD CONSTRAINT "exam_events_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_events" ADD CONSTRAINT "exam_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_attempts" ADD CONSTRAINT "assignment_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
