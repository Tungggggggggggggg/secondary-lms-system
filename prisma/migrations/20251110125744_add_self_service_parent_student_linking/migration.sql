-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LinkRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- DropIndex
DROP INDEX "parent_students_parentId_createdAt_idx";

-- DropIndex
DROP INDEX "parent_students_studentId_createdAt_idx";

-- AlterTable
ALTER TABLE "parent_students" ADD COLUMN     "initiatedBy" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "studentConfirmedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "parent_student_invitations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LinkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "studentId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "parent_student_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student_link_requests" (
    "id" TEXT NOT NULL,
    "status" "LinkRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "parent_student_link_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_invitations_code_key" ON "parent_student_invitations"("code");

-- CreateIndex
CREATE INDEX "parent_student_invitations_studentId_idx" ON "parent_student_invitations"("studentId");

-- CreateIndex
CREATE INDEX "parent_student_invitations_code_idx" ON "parent_student_invitations"("code");

-- CreateIndex
CREATE INDEX "parent_student_invitations_status_idx" ON "parent_student_invitations"("status");

-- CreateIndex
CREATE INDEX "parent_student_invitations_expiresAt_idx" ON "parent_student_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "parent_student_link_requests_parentId_idx" ON "parent_student_link_requests"("parentId");

-- CreateIndex
CREATE INDEX "parent_student_link_requests_studentId_idx" ON "parent_student_link_requests"("studentId");

-- CreateIndex
CREATE INDEX "parent_student_link_requests_status_idx" ON "parent_student_link_requests"("status");

-- CreateIndex
CREATE INDEX "parent_student_link_requests_expiresAt_idx" ON "parent_student_link_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "parent_student_link_requests_parentId_studentId_key" ON "parent_student_link_requests"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "parent_students_status_idx" ON "parent_students"("status");

-- CreateIndex
CREATE INDEX "parent_students_status_createdAt_idx" ON "parent_students"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "parent_student_invitations" ADD CONSTRAINT "parent_student_invitations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_invitations" ADD CONSTRAINT "parent_student_invitations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_link_requests" ADD CONSTRAINT "parent_student_link_requests_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student_link_requests" ADD CONSTRAINT "parent_student_link_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
