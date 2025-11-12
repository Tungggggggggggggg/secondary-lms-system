/**
 * Debug utilities cho Smart Assignment Builder
 * Giúp phát hiện và khắc phục lỗi nhanh chóng
 */

import { AssignmentData, TimeSettings, ValidationState } from '@/types/assignment-builder'
import { validateTimeSettings, validateAllQuestions } from './utils'

/**
 * Debug thông tin assignment data
 */
export const debugAssignmentData = (data: AssignmentData): void => {
  console.group('🔍 [DEBUG] Assignment Data Analysis')
  
  // Basic info
  console.log('📋 Basic Info:', {
    title: data.title || '❌ EMPTY',
    description: data.description || '⚠️ EMPTY',
    type: data.type
  })
  
  // Time settings
  console.log('⏰ Time Settings:', {
    dueDate: data.timeSettings.dueDate || '❌ EMPTY',
    openAt: data.timeSettings.openAt || '⚠️ EMPTY',
    lockAt: data.timeSettings.lockAt || '⚠️ EMPTY',
    timeLimitMinutes: data.timeSettings.timeLimitMinutes || '⚠️ EMPTY'
  })
  
  // Content validation
  if (data.type === 'QUIZ') {
    console.log('📝 Quiz Questions:', {
      count: data.quizQuestions?.length || 0,
      questions: data.quizQuestions?.map((q, i) => ({
        index: i,
        content: q.content ? '✅ OK' : '❌ EMPTY',
        options: q.options.length,
        hasCorrectAnswer: q.options.some(opt => opt.isCorrect) ? '✅ OK' : '❌ NO CORRECT'
      })) || []
    })
  } else {
    console.log('📖 Essay Question:', {
      content: data.essayQuestion?.content ? '✅ OK' : '❌ EMPTY'
    })
  }
  
  console.groupEnd()
}

/**
 * Debug validation state
 */
export const debugValidation = (data: AssignmentData): ValidationState => {
  console.group('🔍 [DEBUG] Validation Analysis')
  
  const errors: string[] = []
  const warnings: string[] = []
  
  // Basic validation
  if (!data.title?.trim()) {
    errors.push('❌ Tiêu đề bài tập trống')
  }
  
  // Time validation
  console.log('⏰ Validating time settings...')
  const timeValidation = validateTimeSettings(data.timeSettings)
  console.log('Time validation result:', timeValidation)
  
  if (!timeValidation.isValid) {
    errors.push(...timeValidation.errors.map(e => `⏰ ${e}`))
    warnings.push(...timeValidation.warnings.map(w => `⚠️ ${w}`))
  }
  
  // Content validation
  if (data.type === 'QUIZ') {
    console.log('📝 Validating quiz questions...')
    const quizValidation = validateAllQuestions(data.quizQuestions || [])
    console.log('Quiz validation result:', quizValidation)
    
    if (!quizValidation.isValid) {
      errors.push(...quizValidation.globalErrors.map(e => `📝 ${e}`))
      warnings.push(...quizValidation.warnings.map(w => `⚠️ ${w}`))
    }
  } else {
    if (!data.essayQuestion?.content?.trim()) {
      errors.push('📖 Nội dung câu hỏi tự luận trống')
    }
  }
  
  const validation: ValidationState = {
    isValid: errors.length === 0,
    fieldErrors: {},
    globalErrors: errors,
    warnings
  }
  
  console.log('🎯 Final validation result:', validation)
  console.groupEnd()
  
  return validation
}

/**
 * Debug datetime format
 */
export const debugDateTime = (dateTimeString: string, label: string): void => {
  console.group(`🕐 [DEBUG] DateTime: ${label}`)
  
  console.log('Raw value:', dateTimeString)
  
  if (!dateTimeString) {
    console.log('❌ Empty datetime')
    console.groupEnd()
    return
  }
  
  try {
    const date = new Date(dateTimeString)
    const now = new Date()
    
    console.log('Parsed date:', date)
    console.log('Is valid:', !isNaN(date.getTime()))
    console.log('ISO string:', date.toISOString())
    console.log('Local string:', date.toLocaleString('vi-VN'))
    console.log('Compared to now:', {
      isPast: date < now,
      isFuture: date > now,
      diffMinutes: Math.round((date.getTime() - now.getTime()) / (1000 * 60))
    })
  } catch (error) {
    console.error('❌ DateTime parse error:', error)
  }
  
  console.groupEnd()
}

/**
 * Debug time settings chi tiết
 */
export const debugTimeSettings = (settings: TimeSettings): void => {
  console.group('🕐 [DEBUG] Time Settings Analysis')
  
  const now = new Date()
  console.log('Current time:', now.toLocaleString('vi-VN'))
  
  // Debug từng field
  debugDateTime(settings.dueDate, 'Due Date')
  debugDateTime(settings.openAt, 'Open At')
  debugDateTime(settings.lockAt, 'Lock At')
  
  if (settings.timeLimitMinutes) {
    console.log('⏱️ Time Limit:', {
      raw: settings.timeLimitMinutes,
      parsed: parseInt(settings.timeLimitMinutes),
      isValid: !isNaN(parseInt(settings.timeLimitMinutes))
    })
  }
  
  // Validate logic
  const due = settings.dueDate ? new Date(settings.dueDate) : null
  const open = settings.openAt ? new Date(settings.openAt) : null
  const lock = settings.lockAt ? new Date(settings.lockAt) : null
  
  console.log('🔍 Logic checks:', {
    dueInFuture: due ? due > now : 'N/A',
    openBeforeDue: open && due ? open < due : 'N/A',
    lockAfterOpen: lock && open ? lock > open : 'N/A',
    lockBeforeDue: lock && due ? lock < due : 'N/A'
  })
  
  console.groupEnd()
}

/**
 * Auto-fix common issues
 */
export const autoFixTimeSettings = (settings: TimeSettings, preventLoop = false): TimeSettings => {
  if (preventLoop) {
    console.log('🔧 [DEBUG] Auto-fix skipped to prevent infinite loop')
    return settings
  }
  
  console.group('🔧 [DEBUG] Auto-fixing time settings')
  
  const now = new Date()
  const fixed: TimeSettings = { ...settings }
  
  // Fix due date nếu trống
  if (!fixed.dueDate) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    tomorrow.setHours(23, 59, 0, 0)
    fixed.dueDate = tomorrow.toISOString().slice(0, 16)
    console.log('✅ Fixed empty due date:', fixed.dueDate)
  }
  
  // Fix due date nếu ở quá khứ
  const due = new Date(fixed.dueDate)
  if (due <= now) {
    const newDue = new Date(now.getTime() + 60 * 60 * 1000) // 1 giờ sau
    fixed.dueDate = newDue.toISOString().slice(0, 16)
    console.log('✅ Fixed past due date:', fixed.dueDate)
  }
  
  // Fix open time nếu sau due date
  if (fixed.openAt) {
    const open = new Date(fixed.openAt)
    const dueFixed = new Date(fixed.dueDate)
    if (open >= dueFixed) {
      fixed.openAt = now.toISOString().slice(0, 16)
      console.log('✅ Fixed open time after due:', fixed.openAt)
    }
  }
  
  // Fix lock time
  if (fixed.lockAt) {
    const lock = new Date(fixed.lockAt)
    const dueFixed = new Date(fixed.dueDate)
    if (lock > dueFixed) {
      fixed.lockAt = dueFixed.toISOString().slice(0, 16)
      console.log('✅ Fixed lock time after due:', fixed.lockAt)
    }
  }
  
  console.log('🎯 Final fixed settings:', fixed)
  console.groupEnd()
  
  return fixed
}

/**
 * Enable debug mode
 */
export const enableDebugMode = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('assignment-builder-debug', 'true')
    console.log('🔍 Debug mode enabled for Assignment Builder')
  }
}

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('assignment-builder-debug') === 'true'
  }
  return false
}

/**
 * Debug log wrapper
 */
export const debugLog = (message: string, data?: any): void => {
  if (isDebugMode()) {
    console.log(`🔍 [DEBUG] ${message}`, data)
  }
}

/**
 * Performance debug
 */
export const debugPerformance = (name: string, fn: () => void): void => {
  if (isDebugMode()) {
    const start = performance.now()
    fn()
    const end = performance.now()
    console.log(`⚡ [PERF] ${name}: ${(end - start).toFixed(2)}ms`)
  } else {
    fn()
  }
}

/**
 * Export debug utilities to window for console access
 */
if (typeof window !== 'undefined') {
  (window as any).assignmentBuilderDebug = {
    enableDebugMode,
    debugAssignmentData,
    debugValidation,
    debugTimeSettings,
    autoFixTimeSettings,
    debugDateTime
  }
}
