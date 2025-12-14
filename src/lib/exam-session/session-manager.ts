/**
 * Exam Session Manager
 * Quản lý phiên thi của học sinh - tạo, theo dõi, cập nhật trạng thái
 */

import { 
  ExamSession, 
  ExamSessionStatus, 
  ExamEventLog,
  ExamEventType,
  AntiCheatConfig,
  FallbackConfig,
  EXAM_CONSTANTS
} from '@/types/exam-system'
import { AssignmentData } from '@/types/assignment-builder'

/**
 * Tạo seed cho randomization dựa trên studentId và assignmentId
 */
export function generateStudentSeed(studentId: string, assignmentId: string): string {
  // Tạo seed deterministic nhưng unique cho mỗi học sinh
  const combined = `${studentId}-${assignmentId}`
  let hash = 0
  
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Shuffle array dựa trên seed (deterministic)
 */
export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const shuffled = [...array]
  let currentIndex = shuffled.length
  
  // Simple seeded random function
  let seedNum = 0
  for (let i = 0; i < seed.length; i++) {
    seedNum = (seedNum * 31 + seed.charCodeAt(i)) >>> 0
  }
  if (seedNum === 0) seedNum = 1
  const seededRandom = () => {
    seedNum = (seedNum * 9301 + 49297) % 233280
    return seedNum / 233280
  }
  
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(seededRandom() * currentIndex)
    currentIndex--
    
    const tmp = shuffled[currentIndex]
    shuffled[currentIndex] = shuffled[randomIndex]
    shuffled[randomIndex] = tmp
  }
  
  return shuffled
}

/**
 * Tạo thứ tự câu hỏi và đáp án cho học sinh
 */
export function generateQuestionOrder(
  assignment: AssignmentData,
  studentId: string,
  antiCheatConfig: AntiCheatConfig
): {
  questionOrder: string[]
  optionOrders: Record<string, string[]>
} {
  const seed = generateStudentSeed(studentId, assignment.title) // Tạm dùng title làm ID
  
  // Lấy danh sách câu hỏi từ quizContent
  const questions = assignment.quizContent?.questions || []
  let questionOrder = questions.map(q => q.id)
  
  // Xáo thứ tự câu hỏi nếu được bật
  if (antiCheatConfig.shuffleQuestions) {
    questionOrder = shuffleWithSeed(questionOrder, seed)
  }
  
  // Tạo thứ tự đáp án cho từng câu hỏi
  const optionOrders: Record<string, string[]> = {}
  
  if (antiCheatConfig.shuffleOptions) {
    questions.forEach(question => {
      const optionIds = question.options.map(opt => opt.label)
      optionOrders[question.id] = shuffleWithSeed(optionIds, seed + question.id)
    })
  } else {
    // Giữ nguyên thứ tự gốc
    questions.forEach(question => {
      optionOrders[question.id] = question.options.map(opt => opt.label)
    })
  }
  
  return { questionOrder, optionOrders }
}

/**
 * Tính toán thời gian kết thúc dự kiến
 */
export function calculateExpectedEndTime(
  startTime: Date,
  timerType: 'PERSONAL' | 'FIXED_DEADLINE' | 'UNLIMITED',
  durationMinutes?: number,
  dueDate?: string
): Date | null {
  switch (timerType) {
    case 'PERSONAL':
      if (!durationMinutes) return null
      return new Date(startTime.getTime() + durationMinutes * 60 * 1000)
      
    case 'FIXED_DEADLINE':
      if (!dueDate) return null
      return new Date(dueDate)
      
    case 'UNLIMITED':
      return null // Không có thời gian kết thúc
      
    default:
      return null
  }
}

/**
 * Tạo phiên thi mới cho học sinh
 */
export async function createExamSession(
  assignmentId: string,
  studentId: string,
  assignment: AssignmentData,
  antiCheatConfig: AntiCheatConfig,
  fallbackConfig: FallbackConfig,
  userAgent: string,
  ipAddress: string
): Promise<ExamSession> {
  const now = new Date()
  const sessionId = `session_${studentId}_${assignmentId}_${now.getTime()}`
  
  // Tạo thứ tự câu hỏi và đáp án
  const { questionOrder, optionOrders } = generateQuestionOrder(
    assignment,
    studentId,
    antiCheatConfig
  )
  
  // Tính toán thời gian từ quizContent/essayContent
  let timerType: 'PERSONAL' | 'FIXED_DEADLINE' | 'UNLIMITED' = 'UNLIMITED'
  let durationMinutes: number | undefined = undefined
  let dueDateStr: string | undefined = undefined

  if (assignment.type === 'QUIZ' && assignment.quizContent) {
    if (typeof assignment.quizContent.timeLimitMinutes === 'number') {
      timerType = 'PERSONAL'
      durationMinutes = assignment.quizContent.timeLimitMinutes
    }
    // Nếu có lockAt thì coi như hạn
    if (assignment.quizContent.lockAt instanceof Date) {
      dueDateStr = assignment.quizContent.lockAt.toISOString()
    }
  } else if (assignment.type === 'ESSAY' && assignment.essayContent) {
    if (assignment.essayContent.dueDate instanceof Date) {
      timerType = 'FIXED_DEADLINE'
      dueDateStr = assignment.essayContent.dueDate.toISOString()
    }
  }

  const expectedEndTime = calculateExpectedEndTime(
    now,
    timerType,
    durationMinutes,
    dueDateStr
  )
  
  // Tính thời gian còn lại
  let timeRemaining = 0
  if (timerType === 'PERSONAL' && durationMinutes) {
    timeRemaining = durationMinutes * 60 // Convert to seconds
  } else if (expectedEndTime) {
    timeRemaining = Math.max(0, Math.floor((expectedEndTime.getTime() - now.getTime()) / 1000))
  }
  
  const session: ExamSession = {
    id: sessionId,
    assignmentId,
    studentId,
    status: 'NOT_STARTED',
    startTime: now,
    expectedEndTime: expectedEndTime || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h nếu null
    actualEndTime: undefined,
    timeRemaining,
    currentQuestionIndex: 0,
    questionOrder,
    optionOrders,
    answers: {},
    disconnectCount: 0,
    totalGraceTime: 0,
    antiCheatConfig,
    metadata: {
      userAgent,
      ipAddress,
      screenResolution: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    createdAt: now,
    updatedAt: now
  }
  
  return session
}

/**
 * Bắt đầu phiên thi
 */
export async function startExamSession(session: ExamSession): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    status: 'IN_PROGRESS',
    startTime: now,
    updatedAt: now
  }
  
  // Log sự kiện bắt đầu thi
  await logExamEvent(session.id, 'SESSION_STARTED', {
    startTime: now.toISOString(),
    questionCount: session.questionOrder.length,
    timeRemaining: session.timeRemaining
  })
  
  return updatedSession
}

/**
 * Tạm dừng phiên thi (khi disconnect)
 */
export async function pauseExamSession(
  session: ExamSession,
  reason: string = 'DISCONNECT_DETECTED'
): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    status: 'PAUSED',
    disconnectCount: session.disconnectCount + 1,
    updatedAt: now
  }
  
  // Log sự kiện tạm dừng
  await logExamEvent(session.id, 'SESSION_PAUSED', {
    reason,
    disconnectCount: updatedSession.disconnectCount,
    timeRemaining: session.timeRemaining
  })
  
  return updatedSession
}

/**
 * Tiếp tục phiên thi (sau khi reconnect)
 */
export async function resumeExamSession(
  session: ExamSession,
  fallbackConfig: FallbackConfig
): Promise<ExamSession> {
  const now = new Date()
  
  // Tính grace period
  const graceTime = fallbackConfig.gracePeriodMinutes * 60 // Convert to seconds
  
  const updatedSession: ExamSession = {
    ...session,
    status: 'IN_PROGRESS',
    timeRemaining: session.timeRemaining + graceTime,
    totalGraceTime: session.totalGraceTime + graceTime,
    updatedAt: now
  }
  
  // Log sự kiện tiếp tục
  await logExamEvent(session.id, 'SESSION_RESUMED', {
    graceTimeAdded: graceTime,
    totalGraceTime: updatedSession.totalGraceTime,
    timeRemaining: updatedSession.timeRemaining
  })
  
  // Log grace period được thêm
  await logExamEvent(session.id, 'GRACE_PERIOD_ADDED', {
    graceTime,
    reason: 'AUTO_RECONNECT',
    disconnectCount: session.disconnectCount
  })
  
  return updatedSession
}

/**
 * Hoàn thành phiên thi
 */
export async function completeExamSession(session: ExamSession): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    status: 'COMPLETED',
    actualEndTime: now,
    timeRemaining: 0,
    updatedAt: now
  }
  
  // Log sự kiện hoàn thành
  await logExamEvent(session.id, 'SESSION_COMPLETED', {
    endTime: now.toISOString(),
    totalDuration: now.getTime() - session.startTime!.getTime(),
    questionsAnswered: Object.keys(session.answers).length,
    totalGraceTime: session.totalGraceTime
  })
  
  return updatedSession
}

/**
 * Chấm dứt phiên thi (vi phạm hoặc hết thời gian)
 */
export async function terminateExamSession(
  session: ExamSession,
  reason: string
): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    status: 'TERMINATED',
    actualEndTime: now,
    timeRemaining: 0,
    updatedAt: now
  }
  
  // Log sự kiện chấm dứt
  await logExamEvent(session.id, 'SESSION_TERMINATED', {
    reason,
    endTime: now.toISOString(),
    questionsAnswered: Object.keys(session.answers).length
  }, 'CRITICAL')
  
  return updatedSession
}

/**
 * Cập nhật đáp án
 */
export async function updateAnswer(
  session: ExamSession,
  questionId: string,
  answer: string | string[]
): Promise<ExamSession> {
  const now = new Date()
  
  const updatedAnswers = {
    ...session.answers,
    [questionId]: answer
  }
  
  const updatedSession: ExamSession = {
    ...session,
    answers: updatedAnswers,
    updatedAt: now
  }
  
  // Log sự kiện trả lời câu hỏi
  await logExamEvent(session.id, 'QUESTION_ANSWERED', {
    questionId,
    answer,
    timeRemaining: session.timeRemaining,
    currentQuestionIndex: session.currentQuestionIndex
  })
  
  return updatedSession
}

/**
 * Chuyển câu hỏi
 */
export async function navigateToQuestion(
  session: ExamSession,
  questionIndex: number
): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    currentQuestionIndex: questionIndex,
    updatedAt: now
  }
  
  // Log sự kiện chuyển câu hỏi
  await logExamEvent(session.id, 'QUESTION_CHANGED', {
    fromIndex: session.currentQuestionIndex,
    toIndex: questionIndex,
    timeRemaining: session.timeRemaining
  })
  
  return updatedSession
}

/**
 * Cập nhật thời gian còn lại
 */
export async function updateTimeRemaining(
  session: ExamSession,
  timeRemaining: number
): Promise<ExamSession> {
  const now = new Date()
  
  const updatedSession: ExamSession = {
    ...session,
    timeRemaining: Math.max(0, timeRemaining),
    updatedAt: now
  }
  
  // Kiểm tra hết thời gian
  if (updatedSession.timeRemaining === 0 && session.status === 'IN_PROGRESS') {
    return await terminateExamSession(updatedSession, 'TIME_EXPIRED')
  }
  
  return updatedSession
}

/**
 * Log sự kiện trong phiên thi
 */
export async function logExamEvent(
  sessionId: string,
  eventType: ExamEventType,
  data: Record<string, unknown>,
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' = 'INFO',
  notes?: string
): Promise<void> {
  const event: Omit<ExamEventLog, 'id' | 'createdAt'> = {
    sessionId,
    eventType,
    timestamp: new Date(),
    data: JSON.stringify(data), // Convert to string for storage
    severity,
    notes
  }
  
  // TODO: Lưu vào database
  console.log(`[EXAM_EVENT] ${eventType}:`, event)

  // Nếu chạy trên client, cố gắng gửi log lên API /api/exam-events
  try {
    if (typeof window !== 'undefined') {
      const parts = sessionId.split('_')
      // Định dạng: session_${studentId}_${assignmentId}_${timestamp}
      const assignmentId = parts.length >= 4 ? parts[2] : undefined

      if (assignmentId) {
        const payload = {
          assignmentId,
          eventType,
          // attempt hiện chưa được encode trong sessionId, để null
          attempt: null as number | null,
          metadata: {
            ...data,
            severity,
            notes,
            sessionId,
          },
        }

        void fetch('/api/exam-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
    }
  } catch (err) {
    console.error('[EXAM_EVENT] Failed to send event to API', err)
  }
}

/**
 * Kiểm tra xem session có cần can thiệp không
 */
export function needsIntervention(session: ExamSession): boolean {
  // Quá nhiều disconnect
  if (session.disconnectCount >= EXAM_CONSTANTS.MAX_RECONNECTS) {
    return true
  }
  
  // Đang bị pause quá lâu
  if (session.status === 'PAUSED') {
    const pausedTime = Date.now() - session.updatedAt.getTime()
    if (pausedTime > EXAM_CONSTANTS.SESSION_TIMEOUT * 60 * 1000) {
      return true
    }
  }
  
  // Hết thời gian nhưng vẫn đang làm
  if (session.timeRemaining <= 0 && session.status === 'IN_PROGRESS') {
    return true
  }
  
  return false
}

/**
 * Tính toán điểm nghi ngờ gian lận
 */
export function calculateSuspicionScore(session: ExamSession): number {
  let score = 0
  
  // Disconnect nhiều lần
  score += session.disconnectCount * 10
  
  // Grace time quá nhiều
  if (session.totalGraceTime > 300) { // > 5 phút
    score += 20
  }
  
  // TODO: Thêm các yếu tố khác như:
  // - Thời gian trả lời quá nhanh/chậm
  // - Pattern trả lời bất thường
  // - Tab switching detection
  
  return Math.min(score, EXAM_CONSTANTS.MAX_SUSPICION_SCORE)
}

/**
 * Validate session state
 */
export function validateSessionState(session: ExamSession): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Kiểm tra thời gian
  if (session.timeRemaining < 0) {
    errors.push('Thời gian còn lại không thể âm')
  }
  
  // Kiểm tra trạng thái
  const validStatuses: ExamSessionStatus[] = [
    'NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'EXPIRED', 'TERMINATED'
  ]
  if (!validStatuses.includes(session.status)) {
    errors.push(`Trạng thái session không hợp lệ: ${session.status}`)
  }
  
  // Kiểm tra câu hỏi hiện tại
  if (session.currentQuestionIndex < 0 || 
      session.currentQuestionIndex >= session.questionOrder.length) {
    errors.push('Chỉ số câu hỏi hiện tại không hợp lệ')
  }
  
  // Warnings
  if (session.disconnectCount > 1) {
    warnings.push(`Học sinh đã disconnect ${session.disconnectCount} lần`)
  }
  
  if (session.totalGraceTime > 600) { // > 10 phút
    warnings.push('Tổng thời gian gia hạn quá nhiều')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
