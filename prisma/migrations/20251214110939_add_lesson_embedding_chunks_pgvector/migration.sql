-- DropIndex (safe if index does not exist)
DROP INDEX IF EXISTS "lesson_embedding_chunks_embedding_ivfflat_idx";

-- AlterTable
ALTER TABLE IF EXISTS "lesson_embedding_chunks" ALTER COLUMN "updatedAt" DROP DEFAULT;
