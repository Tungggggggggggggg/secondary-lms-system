/**
 * Types và Interfaces cho Smart Exam System
 * Hỗ trợ personal timer, anti-cheat, auto-save, và fallback mechanisms
 */

// ===== CORE EXAM TYPES =====

/**
 * Trạng thái của một phiên thi
 */
export type ExamSessionStatus = 
  | 'NOT_STARTED'    // Chưa bắt đầu
  | 'IN_PROGRESS'    // Đang làm bài
  | 'PAUSED'         // Tạm dừng (do disconnect)
  | 'COMPLETED'      // Đã hoàn thành
  | 'EXPIRED'        // Hết thời gian
  | 'TERMINATED'     // Bị chấm dứt (vi phạm)

/**
 * Loại timer cho bài thi
 */
export type TimerType = 
  | 'PERSONAL'       // Timer cá nhân - bắt đầu khi học sinh vào
  | 'FIXED_DEADLINE' // Hạn nộp cố định - như cũ
  | 'UNLIMITED'      // Không giới hạn thời gian

/**
 * Cấu hình chống gian lận
 */
export interface AntiCheatConfig {
  /** Xáo thứ tự câu hỏi */
  shuffleQuestions: boolean
  
  /** Xáo thứ tự đáp án */
  shuffleOptions: boolean
  
  /** Hiển thị từng câu một (không cho quay lại) */
  singleQuestionMode: boolean
  
  /** Giới hạn thời gian mỗi câu (giây) */
  timePerQuestion?: number
  
  /** Chế độ fullscreen bắt buộc */
  requireFullscreen: boolean
  
  /** Phát hiện chuyển tab */
  detectTabSwitch: boolean
  
  /** Vô hiệu hóa copy/paste */
  disableCopyPaste: boolean
  
  /** Preset cấu hình */
  preset: 'BASIC' | 'MEDIUM' | 'ADVANCED' | 'CUSTOM'
  
  /** Bật so khớp gần đúng cho FILL_BLANK */
  enableFuzzyFillBlank?: boolean
  
  /** Ngưỡng fuzzy (0..0.5): khoảng cách/độ dài tối đa được chấp nhận */
  fuzzyThreshold?: number

  /** Chính sách hiển thị đáp án đúng cho học sinh */
  showCorrectMode?: 'never' | 'afterSubmit' | 'afterLock'
}

/**
 * Cấu hình fallback system
 */
export interface FallbackConfig {
  /** Thời gian gia hạn khi disconnect (phút) */
  gracePeriodMinutes: number
  
  /** Số lần reconnect tối đa */
  maxReconnects: number
  
  /** Tự động approve grace period */
  autoApproveGrace: boolean
  
  /** Khoảng thời gian auto-save (giây) */
  autoSaveInterval: number
  
  /** Ngưỡng phát hiện suspicious behavior */
  suspiciousThreshold: number
  
  /** Hỗ trợ offline mode */
  offlineMode: boolean
}

/**
 * Thông tin phiên thi của học sinh
 */
export interface ExamSession {
  /** ID phiên thi */
  id: string
  
  /** ID bài thi */
  assignmentId: string
  
  /** ID học sinh */
  studentId: string
  
  /** Trạng thái phiên thi */
  status: ExamSessionStatus
  
  /** Thời gian bắt đầu */
  startTime: Date
  
  /** Thời gian kết thúc dự kiến */
  expectedEndTime: Date
  
  /** Thời gian kết thúc thực tế */
  actualEndTime?: Date
  
  /** Thời gian còn lại (giây) */
  timeRemaining: number
  
  /** Câu hỏi hiện tại */
  currentQuestionIndex: number
  
  /** Thứ tự câu hỏi đã xáo */
  questionOrder: string[]
  
  /** Thứ tự đáp án đã xáo cho từng câu */
  optionOrders: Record<string, string[]>
  
  /** Đáp án đã chọn */
  answers: Record<string, string | string[]>
  
  /** Số lần disconnect */
  disconnectCount: number
  
  /** Thời gian gia hạn tổng cộng (giây) */
  totalGraceTime: number
  
  /** Cấu hình chống gian lận */
  antiCheatConfig: AntiCheatConfig
  
  /** Metadata bổ sung */
  metadata: {
    userAgent: string
    ipAddress: string
    screenResolution: string
    timezone: string
  }
  
  /** Timestamps quan trọng */
  createdAt: Date
  updatedAt: Date
}

/**
 * Dữ liệu auto-save
 */
export interface AutoSaveData {
  /** ID phiên thi */
  sessionId: string
  
  /** Timestamp save */
  timestamp: Date
  
  /** Câu hỏi hiện tại */
  currentQuestionIndex: number
  
  /** Thời gian còn lại */
  timeRemaining: number
  
  /** Đáp án hiện tại */
  answers: Record<string, string | string[]>
  
  /** Trạng thái UI */
  uiState: {
    scrollPosition: number
    selectedOption?: string
    isReviewing: boolean
  }
}

/**
 * Log sự kiện trong phiên thi
 */
export interface ExamEventLog {
  /** ID log */
  id: string
  
  /** ID phiên thi */
  sessionId: string
  
  /** Loại sự kiện */
  eventType: ExamEventType
  
  /** Timestamp */
  timestamp: Date
  
  /** Dữ liệu sự kiện (JSON string) */
  data: string
  
  /** Mức độ nghiêm trọng */
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  
  /** Ghi chú */
  notes?: string
}

/**
 * Các loại sự kiện trong thi
 */
export type ExamEventType =
  | 'SESSION_STARTED'      // Bắt đầu thi
  | 'SESSION_PAUSED'       // Tạm dừng
  | 'SESSION_RESUMED'      // Tiếp tục
  | 'SESSION_COMPLETED'    // Hoàn thành
  | 'SESSION_TERMINATED'   // Chấm dứt
  | 'QUESTION_ANSWERED'    // Trả lời câu hỏi
  | 'QUESTION_CHANGED'     // Chuyển câu hỏi
  | 'AUTO_SAVED'           // Auto-save
  | 'DISCONNECT_DETECTED'  // Phát hiện disconnect
  | 'RECONNECT_SUCCESS'    // Reconnect thành công
  | 'GRACE_PERIOD_ADDED'   // Thêm grace period
  | 'TAB_SWITCH_DETECTED'  // Phát hiện chuyển tab
  | 'SUSPICIOUS_BEHAVIOR_DETECTED' // Phát hiện hành vi nghi ngờ
  | 'FULLSCREEN_EXIT'      // Thoát fullscreen
  | 'COPY_PASTE_ATTEMPT'   // Thử copy/paste
  | 'SUSPICIOUS_BEHAVIOR'  // Hành vi đáng ngờ
  | 'TEACHER_INTERVENTION' // Giáo viên can thiệp

/**
 * Thống kê phiên thi
 */
export interface ExamSessionStats {
  /** Tổng thời gian làm bài */
  totalDuration: number
  
  /** Thời gian trung bình mỗi câu */
  averageTimePerQuestion: number
  
  /** Số câu đã trả lời */
  questionsAnswered: number
  
  /** Số câu bỏ trống */
  questionsSkipped: number
  
  /** Số lần thay đổi đáp án */
  answerChanges: number
  
  /** Số lần disconnect */
  disconnects: number
  
  /** Thời gian gia hạn */
  graceTimeUsed: number
  
  /** Điểm nghi ngờ gian lận (0-100) */
  suspicionScore: number
}

// ===== ENHANCED ASSIGNMENT TYPES =====

/**
 * Cấu hình thời gian mở rộng
 */
export interface EnhancedTimeSettings {
  /** Loại timer */
  timerType: TimerType
  
  /** Thời gian làm bài (phút) - cho PERSONAL timer */
  durationMinutes?: number
  
  /** Hạn nộp cố định - cho FIXED_DEADLINE */
  dueDate?: string
  
  /** Thời gian mở bài */
  openAt?: string
  
  /** Thời gian khóa bài */
  lockAt?: string
  
  /** Giới hạn thời gian mỗi câu (giây) */
  timePerQuestion?: number
  
  /** Cảnh báo thời gian (phút trước khi hết) */
  warningMinutes: number[]
  
  /** Tự động nộp khi hết thời gian */
  autoSubmit: boolean
}

/**
 * Câu hỏi với metadata mở rộng
 */
export interface EnhancedQuizQuestion {
  /** ID câu hỏi */
  id: string
  
  /** Nội dung câu hỏi */
  content: string
  
  /** Loại câu hỏi */
  type: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK'
  
  /** Thứ tự gốc */
  originalOrder: number
  
  /** Các đáp án */
  options: EnhancedQuizOption[]
  
  /** Điểm số */
  points: number
  
  /** Thời gian giới hạn riêng (giây) */
  timeLimit?: number
  
  /** Độ khó (1-5) */
  difficulty: number
  
  /** Tags phân loại */
  tags: string[]
  
  /** Giải thích đáp án */
  explanation?: string
  
  /** Hình ảnh/media đính kèm */
  attachments: string[]
}

/**
 * Đáp án với metadata mở rộng
 */
export interface EnhancedQuizOption {
  /** ID đáp án */
  id: string
  
  /** Nhãn (A, B, C, D...) */
  label: string
  
  /** Nội dung đáp án */
  content: string
  
  /** Đáp án đúng */
  isCorrect: boolean
  
  /** Thứ tự gốc */
  originalOrder: number
  
  /** Điểm số riêng (cho câu nhiều đáp án) */
  points?: number
  
  /** Giải thích tại sao đúng/sai */
  explanation?: string
}

/**
 * Bài thi với tính năng mở rộng
 */
export interface EnhancedAssignment {
  /** Thông tin cơ bản */
  id: string
  title: string
  description: string
  type: 'QUIZ' | 'ESSAY' | 'MIXED'
  
  /** Cấu hình thời gian mở rộng */
  timeSettings: EnhancedTimeSettings
  
  /** Câu hỏi trắc nghiệm */
  quizQuestions: EnhancedQuizQuestion[]
  
  /** Câu hỏi tự luận */
  essayQuestions: EssayQuestion[]
  
  /** Cấu hình chống gian lận */
  antiCheatConfig: AntiCheatConfig
  
  /** Cấu hình fallback */
  fallbackConfig: FallbackConfig
  
  /** Cấu hình chấm điểm */
  gradingConfig: {
    totalPoints: number
    passingScore: number
    showResultsImmediately: boolean
    showCorrectAnswers: boolean
    allowReview: boolean
  }
  
  /** Metadata */
  createdBy: string
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  
  /** Thống kê */
  stats: {
    totalAttempts: number
    averageScore: number
    averageDuration: number
    completionRate: number
  }
}

/**
 * Câu hỏi tự luận mở rộng
 */
export interface EssayQuestion {
  id: string
  content: string
  type: 'SHORT_ANSWER' | 'LONG_ESSAY' | 'CODE'
  points: number
  timeLimit?: number
  wordLimit?: number
  rubric?: EssayRubric[]
  sampleAnswer?: string
}

/**
 * Rubric chấm điểm tự luận
 */
export interface EssayRubric {
  criteria: string
  maxPoints: number
  description: string
  levels: {
    score: number
    description: string
  }[]
}

// ===== TEACHER MONITORING TYPES =====

/**
 * Dashboard data cho giáo viên
 */
export interface TeacherDashboardData {
  /** Tổng quan */
  overview: {
    totalStudents: number
    activeStudents: number
    completedStudents: number
    averageProgress: number
  }
  
  /** Danh sách phiên thi */
  sessions: ExamSession[]
  
  /** Cảnh báo */
  alerts: {
    disconnectedStudents: string[]
    suspiciousActivities: string[]
    technicalIssues: string[]
  }
  
  /** Thống kê real-time */
  realTimeStats: {
    averageTimePerQuestion: number
    mostDifficultQuestion: string
    commonWrongAnswers: Record<string, number>
  }
}

/**
 * Hành động can thiệp của giáo viên
 */
export interface TeacherIntervention {
  sessionId: string
  action: TeacherAction
  reason: string
  additionalTime?: number
  notes?: string
  timestamp: Date
}

/**
 * Các hành động giáo viên có thể thực hiện
 */
export type TeacherAction =
  | 'EXTEND_TIME'      // Gia hạn thời gian
  | 'RESET_SESSION'    // Reset phiên thi
  | 'TERMINATE_SESSION' // Chấm dứt phiên thi
  | 'ALLOW_RECONNECT'  // Cho phép reconnect
  | 'CLEAR_VIOLATIONS' // Xóa vi phạm
  | 'MANUAL_SUBMIT'    // Nộp bài thủ công

// ===== UTILITY TYPES =====

/**
 * Kết quả validation
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Response API chung
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
}

/**
 * Pagination
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// ===== CONSTANTS =====

/**
 * Các hằng số mặc định
 */
export const EXAM_CONSTANTS = {
  /** Cấu hình fallback mặc định */
  DEFAULT_FALLBACK_CONFIG: {
    gracePeriodMinutes: 3,
    maxReconnects: 2,
    autoApproveGrace: true,
    autoSaveInterval: 10,
    suspiciousThreshold: 3,
    offlineMode: false
  } as FallbackConfig,
  
  /** Cấu hình anti-cheat mặc định */
  DEFAULT_ANTI_CHEAT_CONFIG: {
    shuffleQuestions: false,
    shuffleOptions: false,
    singleQuestionMode: false,
    requireFullscreen: false,
    detectTabSwitch: false,
    disableCopyPaste: false,
    preset: 'BASIC'
  } as AntiCheatConfig,
  
  /** Thời gian auto-save (giây) */
  AUTO_SAVE_INTERVAL: 10,
  
  /** Thời gian grace period mặc định (phút) */
  DEFAULT_GRACE_PERIOD: 3,
  
  /** Số lần reconnect tối đa */
  MAX_RECONNECTS: 2,
  
  /** Thời gian timeout session (phút) */
  SESSION_TIMEOUT: 30,
  
  /** Điểm nghi ngờ tối đa */
  MAX_SUSPICION_SCORE: 100
} as const

// ===== TYPE GUARDS =====

/**
 * Kiểm tra xem có phải ExamSession không
 */
export function isExamSession(obj: any): obj is ExamSession {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.assignmentId === 'string' &&
    typeof obj.studentId === 'string' &&
    Object.values(['NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'EXPIRED', 'TERMINATED']).includes(obj.status)
}

/**
 * Kiểm tra xem session có đang active không
 */
export function isActiveSession(session: ExamSession): boolean {
  return ['IN_PROGRESS', 'PAUSED'].includes(session.status)
}

/**
 * Kiểm tra xem có cần can thiệp không
 */
export function needsIntervention(session: ExamSession): boolean {
  return session.disconnectCount >= 2 || 
         session.status === 'PAUSED' ||
         (session.timeRemaining <= 0 && session.status === 'IN_PROGRESS')
}
