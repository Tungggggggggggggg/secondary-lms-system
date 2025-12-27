CREATE TABLE IF NOT EXISTS "lesson_attachments" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesson_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lesson_attachments_lessonId_createdAt_idx" ON "lesson_attachments"("lessonId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lesson_attachments_lessonId_fkey'
  ) THEN
    ALTER TABLE "lesson_attachments" ADD CONSTRAINT "lesson_attachments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
