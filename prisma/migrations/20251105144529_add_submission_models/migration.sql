/*
  Warnings:

  - A unique constraint covering the columns `[assignmentId,studentId,attempt]` on the table `assignment_submissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "submission_files" DROP CONSTRAINT "submission_files_submissionId_fkey";

-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "submission_files" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_studentId_attempt_key" ON "assignment_submissions"("assignmentId", "studentId", "attempt");

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
