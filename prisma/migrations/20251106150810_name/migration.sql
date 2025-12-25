/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actorRole" TEXT,
ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "classrooms" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "announcements_organizationId_createdAt_idx" ON "announcements"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "assignments_organizationId_createdAt_idx" ON "assignments"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "classrooms_organizationId_createdAt_idx" ON "classrooms"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "courses_organizationId_createdAt_idx" ON "courses"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_createdAt_idx" ON "organization_members"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
