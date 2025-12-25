-- Enable pgvector extension (Supabase/Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create lesson_embedding_chunks table
CREATE TABLE IF NOT EXISTS "lesson_embedding_chunks" (
  "id" TEXT PRIMARY KEY,
  "lessonId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "lesson_embedding_chunks_lessonId_chunkIndex_key"
  ON "lesson_embedding_chunks" ("lessonId", "chunkIndex");

CREATE INDEX IF NOT EXISTS "lesson_embedding_chunks_courseId_idx"
  ON "lesson_embedding_chunks" ("courseId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lesson_embedding_chunks_lessonId_fkey'
  ) THEN
    ALTER TABLE "lesson_embedding_chunks" ADD CONSTRAINT "lesson_embedding_chunks_lessonId_fkey"
      FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'lesson_embedding_chunks_courseId_fkey'
  ) THEN
    ALTER TABLE "lesson_embedding_chunks" ADD CONSTRAINT "lesson_embedding_chunks_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Optional: cosine index for vector search (ivfflat)
-- Note: requires ANALYZE after bulk insert for best performance.
CREATE INDEX IF NOT EXISTS "lesson_embedding_chunks_embedding_ivfflat_idx"
  ON "lesson_embedding_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
