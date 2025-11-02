-- CreateTable
CREATE TABLE "assignment_classrooms" (
    "id" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroomId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,

    CONSTRAINT "assignment_classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignment_classrooms_classroomId_assignmentId_key" ON "assignment_classrooms"("classroomId", "assignmentId");

-- AddForeignKey
ALTER TABLE "assignment_classrooms" ADD CONSTRAINT "assignment_classrooms_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_classrooms" ADD CONSTRAINT "assignment_classrooms_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
