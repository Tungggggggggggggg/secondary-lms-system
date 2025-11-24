-- Add missing JSON columns to assignment_submissions for Prisma model compatibility
ALTER TABLE "assignment_submissions"
  ADD COLUMN IF NOT EXISTS "presentation" JSONB,
  ADD COLUMN IF NOT EXISTS "contentSnapshot" JSONB;
