/**
 * Types và Interfaces cho Smart Assignment Builder
 * Định nghĩa các kiểu dữ liệu chuyên nghiệp cho hệ thống tạo bài tập thông minh
 * Tương thích với Smart Exam System
 */

import { 
  AntiCheatConfig, 
  FallbackConfig,
  TimerType 
} from './exam-system'

// ===== CORE TYPES =====

/**
 * Loại bài tập (simplified workflow)
 */
export type AssignmentType = 'QUIZ' | 'ESSAY'

/**
 * Format nộp bài cho Essay
 */
export type SubmissionFormat = 'TEXT' | 'FILE' | 'BOTH'

/**
 * Loại câu hỏi trắc nghiệm (mở rộng)
 */
export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK'

/**
 * Loại câu hỏi tự luận (mở rộng)
 */
export type EssayType = 'SHORT_ANSWER' | 'LONG_ESSAY' | 'CODE'

// ===== QUIZ TYPES =====
export interface QuizOption {
  label: string
  content: string
  isCorrect: boolean
}

export interface QuizQuestion {
  id: string
  content: string
  type: 'SINGLE' | 'MULTIPLE' | 'TRUE_FALSE' | 'FILL_BLANK'
  options: QuizOption[]
  order?: number
  explanation?: string // Giải thích đáp án
}

export interface QuizImportResult {
  success: boolean
  questions: QuizQuestion[]
  errors: string[]
  warnings: string[]
}

// ===== ESSAY TYPES =====
export interface EssayQuestion {
  id: string
  content: string
  type: EssayType
  wordLimit?: {
    min?: number
    max?: number
  }
  rubric?: EssayRubric
  attachments?: string[]
}

export interface EssayRubric {
  criteria: RubricCriterion[]
  totalPoints: number
}

export interface RubricCriterion {
  id: string
  name: string
  description: string
  weight: number // Phần trăm điểm
  levels: RubricLevel[]
}

export interface RubricLevel {
  score: number
  description: string
}

// ===== TIME MANAGEMENT TYPES =====
/**
 * Cấu hình thởi gian cho bài tập (legacy - để tương thích)
 */
export interface TimeSettings {
  /** Hạn nộp bài (ISO string) */
  dueDate: string
  
  /** Thời gian mở bài (ISO string) */
  openAt: string
  
  /** Thời gian khóa bài (ISO string) */
  lockAt: string
  
  /** Giới hạn thời gian làm bài (phút) */
  timeLimitMinutes: string
}

/**
 * Preset thời gian thông minh (cập nhật)
 */
export interface TimePreset {
  id: string
  name: string
  description: string
  icon: string
  
  /** Loại timer */
  timerType: TimerType
  
  /** Thời gian làm bài (phút) - cho PERSONAL timer */
  durationMinutes?: number
  
  /** Số ngày đến hạn - cho FIXED_DEADLINE */
  dueInDays?: number
  
  /** Mở ngay */
  openNow: boolean
  
  /** Khóa cùng lúc với hạn nộp */
  lockWithDue: boolean
  
  /** Giới hạn thời gian (phút) - legacy */
  timeLimit?: number
  
  /** Phân loại */
  category: 'homework' | 'quiz' | 'exam' | 'project'
  
  /** Đánh dấu là instant quiz */
  isInstant?: boolean
}

/**
 * Kết quả validation thời gian
 */
export interface TimeValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ===== ASSIGNMENT BUILDER TYPES =====

export interface AssignmentData {
  // Step 1: Type Selection
  type: AssignmentType
  
  // Step 2: Basic Info
  title: string
  description?: string
  subject?: string
  classrooms?: string[]
  
  // Step 3A: Essay Content
  essayContent?: {
    question: string
    attachments?: File[]
    submissionFormat: SubmissionFormat
    openAt?: Date
    dueDate?: Date
  }
  
  // Step 3B: Quiz Content  
  quizContent?: {
    questions: QuizQuestion[]
    timeLimitMinutes: number
    openAt?: Date
    lockAt?: Date
    maxAttempts: number
    antiCheatConfig?: AntiCheatConfig
  }
}

export interface AssignmentMetadata {
  subject?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  tags?: string[]
  estimatedDuration?: number // phút
  createdFrom?: 'manual' | 'template' | 'import' | 'ai_generated'
}

// ===== TEMPLATE TYPES =====
export interface AssignmentTemplate {
  id: string
  name: string
  description: string
  subject: string
  type: 'ESSAY' | 'QUIZ'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  content: Partial<AssignmentData>
  usage: number
  rating: number
  createdBy?: string
  isPublic: boolean
}

// ===== BULK IMPORT TYPES =====
export interface BulkImportOptions {
  format: 'pipe_separated' | 'inline_format' | 'csv' | 'excel'
  hasHeaders: boolean
  delimiter?: string
  encoding?: string
}

export interface ImportValidationRule {
  field: string
  required: boolean
  validator?: (value: any) => boolean
  errorMessage?: string
}

// ===== UI STATE TYPES =====
export interface BuilderUIState {
  currentStep: 'type_selection' | 'content_creation' | 'time_setup' | 'preview' | 'publish'
  isLoading: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
  isDirty: boolean
  lastSaved?: Date
}

export interface ValidationState {
  isValid: boolean
  fieldErrors: Record<string, string>
  globalErrors: string[]
  warnings: string[]
}

// ===== PERFORMANCE TRACKING TYPES =====
export interface BuilderMetrics {
  startTime: number
  endTime?: number
  stepsCompleted: string[]
  errorsEncountered: string[]
  timeSpentPerStep: Record<string, number>
  userActions: UserAction[]
}

export interface UserAction {
  timestamp: number
  action: string
  component: string
  data?: any
}

// ===== API RESPONSE TYPES =====
export interface AssignmentCreateResponse {
  success: boolean
  assignmentId?: string
  message: string
  errors?: string[]
}

export interface TemplateSearchResponse {
  templates: AssignmentTemplate[]
  total: number
  page: number
  hasMore: boolean
}

// ===== UTILITY TYPES =====
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ===== CONSTANTS =====
export const ASSIGNMENT_TYPES = ['ESSAY', 'QUIZ'] as const
export const QUESTION_TYPES = ['SINGLE', 'MULTIPLE'] as const
export const ESSAY_TYPES = ['SHORT_ANSWER', 'LONG_ESSAY', 'CASE_STUDY', 'CREATIVE_WRITING'] as const
export const DIFFICULTY_LEVELS = ['EASY', 'MEDIUM', 'HARD'] as const
export const TIME_PRESET_CATEGORIES = ['homework', 'quiz', 'exam', 'project'] as const

// ===== TYPE GUARDS =====
export const isQuizQuestion = (question: any): question is QuizQuestion => {
  return question && typeof question.content === 'string' && Array.isArray(question.options)
}

export const isEssayQuestion = (question: any): question is EssayQuestion => {
  return question && typeof question.content === 'string' && ESSAY_TYPES.includes(question.type)
}

export const isValidTimeSettings = (settings: any): settings is TimeSettings => {
  return settings && 
         typeof settings.dueDate === 'string' &&
         typeof settings.openAt === 'string' &&
         typeof settings.lockAt === 'string' &&
         typeof settings.timeLimitMinutes === 'string'
}
