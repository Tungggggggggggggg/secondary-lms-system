-- CreateIndex
CREATE INDEX "assignment_classrooms_classroomId_addedAt_idx" ON "assignment_classrooms"("classroomId", "addedAt");

-- CreateIndex
CREATE INDEX "assignments_authorId_createdAt_idx" ON "assignments"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "classroom_students_studentId_joinedAt_idx" ON "classroom_students"("studentId", "joinedAt");
