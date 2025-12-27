-- Add index to speed up "latest submission" queries by (studentId, assignmentId) ordered by attempt DESC
CREATE INDEX IF NOT EXISTS "assignment_submissions_studentId_assignmentId_attempt_desc_idx"
  ON "assignment_submissions" ("studentId", "assignmentId", "attempt" DESC);
