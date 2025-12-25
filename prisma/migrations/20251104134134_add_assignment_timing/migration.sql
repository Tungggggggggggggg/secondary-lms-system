-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "lockAt" TIMESTAMP(3),
ADD COLUMN     "openAt" TIMESTAMP(3),
ADD COLUMN     "timeLimitMinutes" INTEGER;
