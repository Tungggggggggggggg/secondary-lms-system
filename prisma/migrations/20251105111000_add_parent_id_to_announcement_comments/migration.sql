-- AlterTable
ALTER TABLE "announcement_comments" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "announcement_comments_parentId_idx" ON "announcement_comments"("parentId");

-- AddForeignKey
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "announcement_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

