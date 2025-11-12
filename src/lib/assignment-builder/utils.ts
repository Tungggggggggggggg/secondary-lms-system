/**
 * Utility Functions cho Smart Assignment Builder
 * Các hàm tiện ích chuyên nghiệp để xử lý logic phức tạp
 */

import { 
  QuizQuestion, 
  QuizImportResult, 
  TimeSettings, 
  TimeValidationResult,
  BulkImportOptions,
  AssignmentData,
  ValidationState
} from '@/types/assignment-builder'

// ===== QUIZ UTILITIES =====

/**
 * Tạo câu hỏi trắc nghiệm mới với cấu trúc chuẩn
 */
export const createNewQuizQuestion = (order?: number): QuizQuestion => {
  const id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    id,
    content: '',
    type: 'SINGLE',
    order: order ?? 0,
    options: [
      { label: 'A', content: '', isCorrect: false },
      { label: 'B', content: '', isCorrect: false },
      { label: 'C', content: '', isCorrect: false },
      { label: 'D', content: '', isCorrect: false }
    ]
  }
}

/**
 * Tạo nhiều câu hỏi cùng lúc
 */
export const createMultipleQuestions = (count: number, startOrder = 0): QuizQuestion[] => {
  return Array.from({ length: count }, (_, index) => 
    createNewQuizQuestion(startOrder + index)
  )
}

/**
 * Duplicate câu hỏi với ID mới
 */
export const duplicateQuestion = (question: QuizQuestion): QuizQuestion => {
  const newId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return {
    ...question,
    id: newId,
    content: question.content + ' (Bản sao)',
    options: question.options.map(opt => ({ ...opt }))
  }
}

/**
 * Validate câu hỏi trắc nghiệm
 */
export const validateQuizQuestion = (question: QuizQuestion): string[] => {
  const errors: string[] = []
  
  // Kiểm tra nội dung câu hỏi
  if (!question.content.trim()) {
    errors.push('Nội dung câu hỏi không được để trống')
  }
  
  // Kiểm tra đáp án
  const hasCorrectAnswer = question.options.some(opt => opt.isCorrect)
  if (!hasCorrectAnswer) {
    errors.push('Phải có ít nhất một đáp án đúng')
  }
  
  // Kiểm tra nội dung các đáp án
  const emptyOptions = question.options.filter(opt => !opt.content.trim())
  if (emptyOptions.length > 0) {
    errors.push(`Có ${emptyOptions.length} đáp án chưa có nội dung`)
  }
  
  // Kiểm tra logic multiple choice
  if (question.type === 'SINGLE') {
    const correctCount = question.options.filter(opt => opt.isCorrect).length
    if (correctCount > 1) {
      errors.push('Câu hỏi chọn 1 đáp án không thể có nhiều hơn 1 đáp án đúng')
    }
  }
  
  return errors
}

/**
 * Validate toàn bộ danh sách câu hỏi
 */
export const validateAllQuestions = (questions: QuizQuestion[]): ValidationState => {
  const fieldErrors: Record<string, string> = {}
  const globalErrors: string[] = []
  const warnings: string[] = []
  
  if (questions.length === 0) {
    globalErrors.push('Phải có ít nhất một câu hỏi')
  }
  
  questions.forEach((question, index) => {
    const questionErrors = validateQuizQuestion(question)
    if (questionErrors.length > 0) {
      fieldErrors[`question_${index}`] = questionErrors.join(', ')
    }
  })
  
  // Warnings
  if (questions.length < 5) {
    warnings.push('Bài trắc nghiệm nên có ít nhất 5 câu hỏi')
  }
  
  const incompleteQuestions = questions.filter(q => 
    !q.content.trim() || !q.options.some(opt => opt.isCorrect)
  ).length
  
  if (incompleteQuestions > 0) {
    warnings.push(`Có ${incompleteQuestions} câu hỏi chưa hoàn thành`)
  }
  
  return {
    isValid: globalErrors.length === 0 && Object.keys(fieldErrors).length === 0,
    fieldErrors,
    globalErrors,
    warnings
  }
}

// ===== BULK IMPORT UTILITIES =====

/**
 * Parse text bulk import với nhiều format
 */
export const parseBulkQuestions = (
  text: string, 
  options: BulkImportOptions = { format: 'pipe_separated', hasHeaders: false }
): QuizImportResult => {
  const result: QuizImportResult = {
    success: false,
    questions: [],
    errors: [],
    warnings: []
  }
  
  try {
    const lines = text.trim().split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      result.errors.push('Không có dữ liệu để import')
      return result
    }
    
    // Skip headers nếu có
    const dataLines = options.hasHeaders ? lines.slice(1) : lines
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim()
      if (!line) continue
      
      try {
        const question = parseQuestionLine(line, options.format, i)
        if (question) {
          result.questions.push(question)
        }
      } catch (error) {
        result.errors.push(`Dòng ${i + 1}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`)
      }
    }
    
    result.success = result.questions.length > 0
    
    if (result.questions.length !== dataLines.length) {
      result.warnings.push(`Chỉ import được ${result.questions.length}/${dataLines.length} câu hỏi`)
    }
    
  } catch (error) {
    result.errors.push(`Lỗi xử lý: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`)
  }
  
  return result
}

/**
 * Parse một dòng câu hỏi theo format
 */
const parseQuestionLine = (line: string, format: string, index: number): QuizQuestion | null => {
  switch (format) {
    case 'pipe_separated':
      return parsePipeSeparatedLine(line, index)
    case 'inline_format':
      return parseInlineFormatLine(line, index)
    default:
      throw new Error(`Format không được hỗ trợ: ${format}`)
  }
}

/**
 * Parse format: "Câu hỏi|A. Đáp án|B. Đáp án|C. Đáp án|D. Đáp án|A"
 */
const parsePipeSeparatedLine = (line: string, index: number): QuizQuestion | null => {
  const parts = line.split('|').map(p => p.trim())
  
  if (parts.length < 6) {
    throw new Error('Format không đúng. Cần: Câu hỏi|A. Đáp án|B. Đáp án|C. Đáp án|D. Đáp án|Đáp án đúng')
  }
  
  const [questionText, optA, optB, optC, optD, correctAnswer] = parts
  
  if (!questionText) {
    throw new Error('Câu hỏi không được để trống')
  }
  
  const correctLetter = correctAnswer.toUpperCase()
  if (!['A', 'B', 'C', 'D'].includes(correctLetter)) {
    throw new Error('Đáp án đúng phải là A, B, C hoặc D')
  }
  
  return {
    id: `imported_${Date.now()}_${index}`,
    content: questionText,
    type: 'SINGLE',
    order: index,
    options: [
      { label: 'A', content: optA.replace(/^A\.\s*/, ''), isCorrect: correctLetter === 'A' },
      { label: 'B', content: optB.replace(/^B\.\s*/, ''), isCorrect: correctLetter === 'B' },
      { label: 'C', content: optC.replace(/^C\.\s*/, ''), isCorrect: correctLetter === 'C' },
      { label: 'D', content: optD.replace(/^D\.\s*/, ''), isCorrect: correctLetter === 'D' }
    ]
  }
}

/**
 * Parse format: "Câu hỏi? A. Đáp án A B. Đáp án B C. Đáp án C D. Đáp án D [Đáp án: A]"
 */
const parseInlineFormatLine = (line: string, index: number): QuizQuestion | null => {
  const match = line.match(/^(.+?)\s+A\.\s*(.+?)\s+B\.\s*(.+?)\s+C\.\s*(.+?)\s+D\.\s*(.+?)\s*\[Đáp án:\s*([ABCD])\]$/i)
  
  if (!match) {
    throw new Error('Format không đúng. Cần: "Câu hỏi? A. Đáp án A B. Đáp án B C. Đáp án C D. Đáp án D [Đáp án: A]"')
  }
  
  const [, questionText, optA, optB, optC, optD, correctAnswer] = match
  const correctLetter = correctAnswer.toUpperCase()
  
  return {
    id: `imported_${Date.now()}_${index}`,
    content: questionText.trim(),
    type: 'SINGLE',
    order: index,
    options: [
      { label: 'A', content: optA.trim(), isCorrect: correctLetter === 'A' },
      { label: 'B', content: optB.trim(), isCorrect: correctLetter === 'B' },
      { label: 'C', content: optC.trim(), isCorrect: correctLetter === 'C' },
      { label: 'D', content: optD.trim(), isCorrect: correctLetter === 'D' }
    ]
  }
}

// ===== TIME MANAGEMENT UTILITIES =====

/**
 * Validate cài đặt thời gian
 */
/**
 * Validate time settings với support cho personal timer
 */
export const validateTimeSettings = (
  settings: TimeSettings, 
  timerType: 'PERSONAL' | 'FIXED_DEADLINE' | 'UNLIMITED' = 'FIXED_DEADLINE',
  durationMinutes?: number
): TimeValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []
  
  const now = new Date()
  
  // Validate theo loại timer
  switch (timerType) {
    case 'PERSONAL':
      // Personal timer - chỉ cần duration
      if (!durationMinutes || durationMinutes <= 0) {
        errors.push('Thời gian làm bài phải lớn hơn 0 phút')
      } else {
        if (durationMinutes > 480) { // 8 giờ
          warnings.push('Thời gian làm bài quá dài (>8 giờ)')
        } else if (durationMinutes < 5) {
          warnings.push('Thời gian làm bài rất ngắn (<5 phút)')
        }
      }
      
      // Thời gian mở/khóa là optional cho personal timer
      if (settings.openAt) {
        const open = new Date(settings.openAt)
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        if (open < oneHourAgo) {
          warnings.push('Thời gian mở bài đã qua lâu')
        }
      }
      
      if (settings.lockAt) {
        const lock = new Date(settings.lockAt)
        if (lock <= now) {
          errors.push('Thời gian khóa bài phải ở tương lai')
        }
      }
      break
      
    case 'FIXED_DEADLINE':
      // Fixed deadline - cần hạn nộp cố định
      const due = settings.dueDate ? new Date(settings.dueDate) : null
      const open = settings.openAt ? new Date(settings.openAt) : null
      const lock = settings.lockAt ? new Date(settings.lockAt) : null
      
      // Validate hạn nộp - bắt buộc phải có
      if (!settings.dueDate) {
        errors.push('Hạn nộp là bắt buộc cho bài tập có deadline cố định')
      } else if (due) {
        // Cho phép hạn nộp ở quá khứ gần (trong vòng 5 phút) - có thể là do delay
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
        if (due < fiveMinutesAgo) {
          errors.push('Hạn nộp không thể ở quá khứ quá xa')
        } else if (due <= now) {
          warnings.push('Hạn nộp rất gần hoặc đã qua - học sinh có thể không kịp làm bài')
        }
      }
      
      // Validate thời gian mở
      if (open) {
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        if (open < oneHourAgo) {
          warnings.push('Thời gian mở bài đã qua lâu')
        }
      }
      
      // Validate logic thời gian
      if (open && lock && lock <= open) {
        errors.push('Thời gian khóa phải sau thời gian mở')
      }
      
      if (due && lock && lock > due) {
        errors.push('Thời gian khóa không thể sau hạn nộp')
      }
      
      if (open && due && open > due) {
        errors.push('Thời gian mở không thể sau hạn nộp')
      }
      break
      
    case 'UNLIMITED':
      // Unlimited - không giới hạn thời gian, chỉ cần thời gian mở/khóa
      if (settings.openAt) {
        const open = new Date(settings.openAt)
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        if (open < oneHourAgo) {
          warnings.push('Thời gian mở bài đã qua lâu')
        }
      }
      
      if (settings.lockAt) {
        const lock = new Date(settings.lockAt)
        if (lock <= now) {
          warnings.push('Thời gian khóa bài đã qua - học sinh không thể làm bài')
        }
        
        if (settings.openAt) {
          const open = new Date(settings.openAt)
          if (lock <= open) {
            errors.push('Thời gian khóa phải sau thời gian mở')
          }
        }
      }
      break
  }
  
  // Validate giới hạn thời gian
  if (settings.timeLimitMinutes) {
    const timeLimit = parseInt(settings.timeLimitMinutes)
    if (isNaN(timeLimit) || timeLimit <= 0) {
      errors.push('Giới hạn thời gian phải là số dương')
    } else if (timeLimit > 480) { // 8 giờ
      warnings.push('Giới hạn thời gian quá dài (>8 giờ)')
    }
  }
  
  // Additional warnings cho FIXED_DEADLINE
  if (timerType === 'FIXED_DEADLINE' && settings.dueDate && settings.openAt) {
    const due = new Date(settings.dueDate)
    const open = new Date(settings.openAt)
    const diffHours = (due.getTime() - open.getTime()) / (1000 * 60 * 60)
    if (diffHours < 1) {
      warnings.push('Thời gian làm bài quá ngắn (<1 giờ)')
    } else if (diffHours > 24 * 7) {
      warnings.push('Thời gian làm bài quá dài (>1 tuần)')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Tạo time settings cho personal timer
 */
export const createPersonalTimerSettings = (durationMinutes: number): TimeSettings => {
  return {
    dueDate: '', // Không cần due date cho personal timer
    openAt: new Date().toISOString().slice(0, 16), // Mở ngay
    lockAt: '', // Không cần lock time
    timeLimitMinutes: durationMinutes.toString()
  }
}

/**
 * Tạo time settings cho fixed deadline
 */
export const createFixedDeadlineSettings = (
  dueDate: Date,
  openAt?: Date,
  lockAt?: Date,
  timeLimitMinutes?: number
): TimeSettings => {
  return {
    dueDate: dueDate.toISOString().slice(0, 16),
    openAt: openAt ? openAt.toISOString().slice(0, 16) : '',
    lockAt: lockAt ? lockAt.toISOString().slice(0, 16) : '',
    timeLimitMinutes: timeLimitMinutes ? timeLimitMinutes.toString() : ''
  }
}

/**
 * Tạo time settings cho unlimited timer
 */
export const createUnlimitedTimerSettings = (
  openAt?: Date,
  lockAt?: Date
): TimeSettings => {
  return {
    dueDate: '', // Không có deadline
    openAt: openAt ? openAt.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    lockAt: lockAt ? lockAt.toISOString().slice(0, 16) : '',
    timeLimitMinutes: '' // Không giới hạn thời gian
  }
}

/**
 * Convert legacy TimeSettings sang enhanced format
 */
export const convertToEnhancedTimeSettings = (
  settings: TimeSettings,
  timerType: 'PERSONAL' | 'FIXED_DEADLINE' | 'UNLIMITED' = 'FIXED_DEADLINE'
) => {
  const enhanced = {
    timerType,
    durationMinutes: settings.timeLimitMinutes ? parseInt(settings.timeLimitMinutes) : undefined,
    dueDate: settings.dueDate || undefined,
    openAt: settings.openAt || undefined,
    lockAt: settings.lockAt || undefined,
    timePerQuestion: undefined,
    warningMinutes: [5, 1], // Default warnings
    autoSubmit: true
  }
  
  return enhanced
}

/**
 * Format datetime cho hiển thị
 */
export const formatDateTime = (dateTimeString: string): string => {
  if (!dateTimeString) return 'Chưa thiết lập'
  
  try {
    const date = new Date(dateTimeString)
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    })
  } catch {
    return 'Định dạng không hợp lệ'
  }
}

/**
 * Tính thời gian tương đối
 */
export const getRelativeTime = (dateTimeString: string): string => {
  if (!dateTimeString) return ''
  
  try {
    const date = new Date(dateTimeString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Đã qua'
    if (diffDays === 0) return 'Hôm nay'
    if (diffDays === 1) return 'Ngày mai'
    if (diffDays <= 7) return `${diffDays} ngày nữa`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} tuần nữa`
    return `${Math.ceil(diffDays / 30)} tháng nữa`
  } catch {
    return ''
  }
}

// ===== GENERAL UTILITIES =====

/**
 * Debounce function cho performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Generate unique ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true
  if (Array.isArray(obj)) return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  if (typeof obj === 'string') return obj.trim().length === 0
  return false
}

/**
 * Safe JSON parse
 */
export const safeJsonParse = <T>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str)
  } catch {
    return defaultValue
  }
}

/**
 * Log error với context
 */
export const logError = (error: Error, context: string, additionalData?: any): void => {
  console.error(`[AssignmentBuilder] ${context}:`, {
    message: error.message,
    stack: error.stack,
    additionalData,
    timestamp: new Date().toISOString()
  })
}
