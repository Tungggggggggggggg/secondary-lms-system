-- Migration: Thêm Smart Exam System
-- Tạo các bảng mới để support personal timer, anti-cheat, auto-save, và fallback

-- ===== EXAM SESSIONS TABLE =====
-- Quản lý phiên thi của từng học sinh
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startTime" TIMESTAMP(3),
    "expectedEndTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "timeRemaining" INTEGER NOT NULL DEFAULT 0, -- giây
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "questionOrder" TEXT NOT NULL DEFAULT '[]', -- JSON array
    "optionOrders" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "answers" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "disconnectCount" INTEGER NOT NULL DEFAULT 0,
    "totalGraceTime" INTEGER NOT NULL DEFAULT 0, -- giây
    "antiCheatConfig" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "metadata" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- ===== AUTO SAVE DATA TABLE =====
-- Lưu trữ dữ liệu auto-save cho recovery
CREATE TABLE "AutoSaveData" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentQuestionIndex" INTEGER NOT NULL,
    "timeRemaining" INTEGER NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "uiState" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoSaveData_pkey" PRIMARY KEY ("id")
);

-- ===== EXAM EVENT LOGS TABLE =====
-- Logging tất cả sự kiện trong quá trình thi
CREATE TABLE "ExamEventLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" TEXT NOT NULL DEFAULT '{}', -- JSON object
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamEventLog_pkey" PRIMARY KEY ("id")
);

-- ===== TEACHER INTERVENTIONS TABLE =====
-- Lưu trữ các can thiệp của giáo viên
CREATE TABLE "TeacherIntervention" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalTime" INTEGER, -- giây
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherIntervention_pkey" PRIMARY KEY ("id")
);

-- ===== CẬP NHẬT ASSIGNMENT TABLE =====
-- Thêm các cột mới cho Assignment để support exam system
ALTER TABLE "Assignment" ADD COLUMN "timerType" TEXT DEFAULT 'FIXED_DEADLINE';
ALTER TABLE "Assignment" ADD COLUMN "durationMinutes" INTEGER;
ALTER TABLE "Assignment" ADD COLUMN "antiCheatConfig" TEXT DEFAULT '{}';
ALTER TABLE "Assignment" ADD COLUMN "fallbackConfig" TEXT DEFAULT '{}';
ALTER TABLE "Assignment" ADD COLUMN "warningMinutes" TEXT DEFAULT '[5,1]'; -- JSON array
ALTER TABLE "Assignment" ADD COLUMN "autoSubmit" BOOLEAN DEFAULT true;
ALTER TABLE "Assignment" ADD COLUMN "estimatedDuration" INTEGER;
ALTER TABLE "Assignment" ADD COLUMN "difficulty" TEXT DEFAULT 'MEDIUM';
ALTER TABLE "Assignment" ADD COLUMN "tags" TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE "Assignment" ADD COLUMN "instructions" TEXT;

-- ===== CẬP NHẬT QUESTION TABLE =====
-- Thêm metadata cho câu hỏi
ALTER TABLE "Question" ADD COLUMN "points" INTEGER DEFAULT 1;
ALTER TABLE "Question" ADD COLUMN "timeLimit" INTEGER; -- giây
ALTER TABLE "Question" ADD COLUMN "difficulty" INTEGER DEFAULT 3; -- 1-5
ALTER TABLE "Question" ADD COLUMN "tags" TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE "Question" ADD COLUMN "explanation" TEXT;
ALTER TABLE "Question" ADD COLUMN "attachments" TEXT DEFAULT '[]'; -- JSON array

-- ===== INDEXES FOR PERFORMANCE =====
-- Indexes cho ExamSession
CREATE INDEX "ExamSession_assignmentId_idx" ON "ExamSession"("assignmentId");
CREATE INDEX "ExamSession_studentId_idx" ON "ExamSession"("studentId");
CREATE INDEX "ExamSession_status_idx" ON "ExamSession"("status");
CREATE INDEX "ExamSession_startTime_idx" ON "ExamSession"("startTime");
CREATE UNIQUE INDEX "ExamSession_assignmentId_studentId_key" ON "ExamSession"("assignmentId", "studentId");

-- Indexes cho AutoSaveData
CREATE INDEX "AutoSaveData_sessionId_idx" ON "AutoSaveData"("sessionId");
CREATE INDEX "AutoSaveData_timestamp_idx" ON "AutoSaveData"("timestamp");

-- Indexes cho ExamEventLog
CREATE INDEX "ExamEventLog_sessionId_idx" ON "ExamEventLog"("sessionId");
CREATE INDEX "ExamEventLog_eventType_idx" ON "ExamEventLog"("eventType");
CREATE INDEX "ExamEventLog_timestamp_idx" ON "ExamEventLog"("timestamp");
CREATE INDEX "ExamEventLog_severity_idx" ON "ExamEventLog"("severity");

-- Indexes cho TeacherIntervention
CREATE INDEX "TeacherIntervention_sessionId_idx" ON "TeacherIntervention"("sessionId");
CREATE INDEX "TeacherIntervention_teacherId_idx" ON "TeacherIntervention"("teacherId");
CREATE INDEX "TeacherIntervention_timestamp_idx" ON "TeacherIntervention"("timestamp");

-- Indexes mới cho Assignment
CREATE INDEX "Assignment_timerType_idx" ON "Assignment"("timerType");
CREATE INDEX "Assignment_difficulty_idx" ON "Assignment"("difficulty");

-- Indexes mới cho Question
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");
CREATE INDEX "Question_points_idx" ON "Question"("points");

-- ===== FOREIGN KEY CONSTRAINTS =====
-- ExamSession references
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AutoSaveData references
ALTER TABLE "AutoSaveData" ADD CONSTRAINT "AutoSaveData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ExamEventLog references
ALTER TABLE "ExamEventLog" ADD CONSTRAINT "ExamEventLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TeacherIntervention references
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== CHECK CONSTRAINTS =====
-- Validate ExamSession status
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_status_check" 
CHECK ("status" IN ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'EXPIRED', 'TERMINATED'));

-- Validate Assignment timerType
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_timerType_check" 
CHECK ("timerType" IN ('PERSONAL', 'FIXED_DEADLINE', 'UNLIMITED'));

-- Validate Assignment difficulty
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_difficulty_check" 
CHECK ("difficulty" IN ('EASY', 'MEDIUM', 'HARD'));

-- Validate ExamEventLog severity
ALTER TABLE "ExamEventLog" ADD CONSTRAINT "ExamEventLog_severity_check" 
CHECK ("severity" IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'));

-- Validate Question difficulty range
ALTER TABLE "Question" ADD CONSTRAINT "Question_difficulty_check" 
CHECK ("difficulty" >= 1 AND "difficulty" <= 5);

-- Validate positive values
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_timeRemaining_check" CHECK ("timeRemaining" >= 0);
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_disconnectCount_check" CHECK ("disconnectCount" >= 0);
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_totalGraceTime_check" CHECK ("totalGraceTime" >= 0);
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_durationMinutes_check" CHECK ("durationMinutes" > 0 OR "durationMinutes" IS NULL);
ALTER TABLE "Question" ADD CONSTRAINT "Question_points_check" CHECK ("points" > 0);
ALTER TABLE "Question" ADD CONSTRAINT "Question_timeLimit_check" CHECK ("timeLimit" > 0 OR "timeLimit" IS NULL);
