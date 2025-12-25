-- CreateIndex
CREATE INDEX "assignment_classrooms_assignmentId_idx" ON "assignment_classrooms"("assignmentId");

-- CreateIndex
CREATE INDEX "assignment_classrooms_classroomId_idx" ON "assignment_classrooms"("classroomId");

-- CreateIndex
CREATE INDEX "assignment_submissions_assignmentId_studentId_idx" ON "assignment_submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "assignment_submissions_studentId_submittedAt_idx" ON "assignment_submissions"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "assignments_authorId_idx" ON "assignments"("authorId");

-- CreateIndex
CREATE INDEX "assignments_dueDate_idx" ON "assignments"("dueDate");

-- CreateIndex
CREATE INDEX "classroom_students_studentId_idx" ON "classroom_students"("studentId");

-- CreateIndex
CREATE INDEX "classroom_students_classroomId_idx" ON "classroom_students"("classroomId");

-- CreateIndex
CREATE INDEX "classrooms_teacherId_idx" ON "classrooms"("teacherId");

-- CreateIndex
CREATE INDEX "question_comments_questionId_createdAt_idx" ON "question_comments"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "questions_assignmentId_order_idx" ON "questions"("assignmentId", "order");
