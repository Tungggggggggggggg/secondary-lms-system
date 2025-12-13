-- CreateIndex
CREATE INDEX "assignment_submissions_studentId_assignmentId_submittedAt_idx" ON "assignment_submissions"("studentId", "assignmentId", "submittedAt");
