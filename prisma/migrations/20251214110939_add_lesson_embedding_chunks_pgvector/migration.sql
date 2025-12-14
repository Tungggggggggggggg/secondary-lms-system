-- DropIndex
DROP INDEX "lesson_embedding_chunks_embedding_ivfflat_idx";

-- AlterTable
ALTER TABLE "lesson_embedding_chunks" ALTER COLUMN "updatedAt" DROP DEFAULT;
