-- Migration: Assignment Workflow Improvements
-- Date: 2024-11-13
-- Description: Add new fields to support improved assignment creation workflow

BEGIN;

-- 1. Add new fields to assignments table
ALTER TABLE assignments ADD COLUMN subject VARCHAR(100);
ALTER TABLE assignments ADD COLUMN submission_format VARCHAR(20) DEFAULT 'BOTH';
ALTER TABLE assignments ADD COLUMN max_attempts INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN anti_cheat_config JSONB;

-- 2. Add file_type field to assignment_files table
ALTER TABLE IF EXISTS assignment_files
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'SUBMISSION';

-- 3. Update QuestionType enum to support new question types
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'FILL_BLANK';

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject);
CREATE INDEX IF NOT EXISTS idx_assignment_files_file_type ON assignment_files(file_type);

-- 5. Add comments for documentation
COMMENT ON COLUMN assignments.subject IS 'Môn học (optional)';
COMMENT ON COLUMN assignments.submission_format IS 'Format nộp bài cho Essay: TEXT, FILE, BOTH';
COMMENT ON COLUMN assignments.max_attempts IS 'Số lần làm bài tối đa cho Quiz';
COMMENT ON COLUMN assignments.anti_cheat_config IS 'Cấu hình bảo mật cho Quiz (JSON)';
COMMENT ON COLUMN assignment_files.file_type IS 'Loại file: SUBMISSION (học sinh nộp), ATTACHMENT (giáo viên đính kèm)';

COMMIT;
