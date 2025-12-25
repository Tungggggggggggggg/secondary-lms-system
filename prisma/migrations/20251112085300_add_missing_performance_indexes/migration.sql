-- Thêm các performance indexes còn thiếu để tối ưu slow queries

-- 1. Optimize assignment submissions by grade status (cho stats queries)
CREATE INDEX IF NOT EXISTS "assignment_submissions_assignmentId_grade_idx" ON "assignment_submissions"("assignmentId", "grade");

-- 2. Optimize classrooms by teacher + active status
CREATE INDEX IF NOT EXISTS "classrooms_teacherId_isActive_idx" ON "classrooms"("teacherId", "isActive");

-- 3. Optimize users by email (cho login performance)
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

-- 4. Optimize announcements by classroom + created date
CREATE INDEX IF NOT EXISTS "announcements_classroomId_createdAt_idx" ON "announcements"("classroomId", "createdAt" DESC);

-- 5. Optimize assignment submissions by student + created date
CREATE INDEX IF NOT EXISTS "assignment_submissions_studentId_submittedAt_idx" ON "assignment_submissions"("studentId", "submittedAt" DESC);

-- 6. Composite index cho complex dashboard queries
CREATE INDEX IF NOT EXISTS "assignments_authorId_type_createdAt_idx" ON "assignments"("authorId", "type", "createdAt" DESC);

-- 7. Optimize classrooms với created date cho sorting
CREATE INDEX IF NOT EXISTS "classrooms_teacherId_isActive_createdAt_idx" ON "classrooms"("teacherId", "isActive", "createdAt" DESC);
