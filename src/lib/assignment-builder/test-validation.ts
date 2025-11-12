/**
 * Test script để kiểm tra và khắc phục vấn đề validation
 * Chạy trong browser console để debug
 */

import { AssignmentData, TimeSettings } from '@/types/assignment-builder'
import { validateTimeSettings, validateAllQuestions } from './utils'
import { debugAssignmentData, debugValidation, autoFixTimeSettings } from './debug'

/**
 * Test case 1: Bài tập tự luận cơ bản
 */
export const testBasicEssayAssignment = (): AssignmentData => {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  tomorrow.setHours(23, 59, 0, 0)

  return {
    title: 'Bài tập tự luận test',
    description: 'Mô tả test',
    type: 'ESSAY',
    timeSettings: {
      dueDate: tomorrow.toISOString().slice(0, 16),
      openAt: now.toISOString().slice(0, 16),
      lockAt: '',
      timeLimitMinutes: ''
    },
    essayQuestion: {
      id: 'essay_test',
      content: 'Viết một bài luận về chủ đề test',
      type: 'LONG_ESSAY'
    },
    quizQuestions: []
  }
}

/**
 * Test case 2: Bài tập trắc nghiệm cơ bản
 */
export const testBasicQuizAssignment = (): AssignmentData => {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  tomorrow.setHours(23, 59, 0, 0)

  return {
    title: 'Bài tập trắc nghiệm test',
    description: 'Mô tả test',
    type: 'QUIZ',
    timeSettings: {
      dueDate: tomorrow.toISOString().slice(0, 16),
      openAt: now.toISOString().slice(0, 16),
      lockAt: '',
      timeLimitMinutes: '45'
    },
    essayQuestion: {
      id: 'essay_default',
      content: '',
      type: 'LONG_ESSAY'
    },
    quizQuestions: [
      {
        id: 'q1',
        content: 'Câu hỏi test 1?',
        type: 'SINGLE',
        order: 0,
        options: [
          { label: 'A', content: 'Đáp án A', isCorrect: true },
          { label: 'B', content: 'Đáp án B', isCorrect: false },
          { label: 'C', content: 'Đáp án C', isCorrect: false },
          { label: 'D', content: 'Đáp án D', isCorrect: false }
        ]
      }
    ]
  }
}

/**
 * Test case 3: Bài tập có lỗi thời gian
 */
export const testProblematicTimeAssignment = (): AssignmentData => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  return {
    title: 'Bài tập có lỗi thời gian',
    description: 'Test lỗi thời gian',
    type: 'ESSAY',
    timeSettings: {
      dueDate: yesterday.toISOString().slice(0, 16), // Lỗi: quá khứ
      openAt: now.toISOString().slice(0, 16),
      lockAt: '',
      timeLimitMinutes: ''
    },
    essayQuestion: {
      id: 'essay_test',
      content: 'Câu hỏi test',
      type: 'LONG_ESSAY'
    },
    quizQuestions: []
  }
}

/**
 * Chạy tất cả test cases
 */
export const runAllTests = (): void => {
  console.group('🧪 [TEST] Assignment Builder Validation Tests')

  // Test 1: Essay assignment hợp lệ
  console.group('📖 Test 1: Valid Essay Assignment')
  const essayAssignment = testBasicEssayAssignment()
  debugAssignmentData(essayAssignment)
  const essayValidation = debugValidation(essayAssignment)
  console.log('✅ Should be valid:', essayValidation.isValid)
  console.groupEnd()

  // Test 2: Quiz assignment hợp lệ
  console.group('📝 Test 2: Valid Quiz Assignment')
  const quizAssignment = testBasicQuizAssignment()
  debugAssignmentData(quizAssignment)
  const quizValidation = debugValidation(quizAssignment)
  console.log('✅ Should be valid:', quizValidation.isValid)
  console.groupEnd()

  // Test 3: Assignment có lỗi thời gian
  console.group('⚠️ Test 3: Problematic Time Assignment')
  const problematicAssignment = testProblematicTimeAssignment()
  debugAssignmentData(problematicAssignment)
  const problematicValidation = debugValidation(problematicAssignment)
  console.log('❌ Should be invalid:', !problematicValidation.isValid)
  
  // Test auto-fix
  console.log('🔧 Testing auto-fix...')
  const fixedTimeSettings = autoFixTimeSettings(problematicAssignment.timeSettings)
  const fixedAssignment = { ...problematicAssignment, timeSettings: fixedTimeSettings }
  const fixedValidation = debugValidation(fixedAssignment)
  console.log('✅ Should be valid after fix:', fixedValidation.isValid)
  console.groupEnd()

  console.groupEnd()
}

/**
 * Test specific time validation scenarios
 */
export const testTimeValidationScenarios = (): void => {
  console.group('⏰ [TEST] Time Validation Scenarios')

  const now = new Date()

  // Scenario 1: Hạn nộp trong tương lai gần (1 giờ)
  const scenario1: TimeSettings = {
    dueDate: new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
    openAt: now.toISOString().slice(0, 16),
    lockAt: '',
    timeLimitMinutes: ''
  }
  console.log('Scenario 1 (1h future):', validateTimeSettings(scenario1))

  // Scenario 2: Hạn nộp ngày mai
  const scenario2: TimeSettings = {
    dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    openAt: now.toISOString().slice(0, 16),
    lockAt: '',
    timeLimitMinutes: '60'
  }
  console.log('Scenario 2 (tomorrow):', validateTimeSettings(scenario2))

  // Scenario 3: Hạn nộp trong quá khứ (should fail)
  const scenario3: TimeSettings = {
    dueDate: new Date(now.getTime() - 60 * 60 * 1000).toISOString().slice(0, 16),
    openAt: '',
    lockAt: '',
    timeLimitMinutes: ''
  }
  console.log('Scenario 3 (past due):', validateTimeSettings(scenario3))

  // Scenario 4: Không có hạn nộp (should fail)
  const scenario4: TimeSettings = {
    dueDate: '',
    openAt: '',
    lockAt: '',
    timeLimitMinutes: ''
  }
  console.log('Scenario 4 (no due date):', validateTimeSettings(scenario4))

  console.groupEnd()
}

/**
 * Utility để tạo assignment data nhanh cho test
 */
export const createTestAssignment = (
  type: 'ESSAY' | 'QUIZ',
  title: string = 'Test Assignment',
  dueInHours: number = 24
): AssignmentData => {
  const now = new Date()
  const dueDate = new Date(now.getTime() + dueInHours * 60 * 60 * 1000)
  
  const baseAssignment: AssignmentData = {
    title,
    description: 'Test description',
    type,
    timeSettings: {
      dueDate: dueDate.toISOString().slice(0, 16),
      openAt: now.toISOString().slice(0, 16),
      lockAt: '',
      timeLimitMinutes: type === 'QUIZ' ? '45' : ''
    },
    essayQuestion: {
      id: 'essay_default',
      content: type === 'ESSAY' ? 'Test essay question' : '',
      type: 'LONG_ESSAY'
    },
    quizQuestions: type === 'QUIZ' ? [
      {
        id: 'q1',
        content: 'Test question?',
        type: 'SINGLE',
        order: 0,
        options: [
          { label: 'A', content: 'Option A', isCorrect: true },
          { label: 'B', content: 'Option B', isCorrect: false }
        ]
      }
    ] : []
  }

  return baseAssignment
}

// Export cho browser console
if (typeof window !== 'undefined') {
  (window as any).assignmentBuilderTest = {
    runAllTests,
    testTimeValidationScenarios,
    createTestAssignment,
    testBasicEssayAssignment,
    testBasicQuizAssignment,
    testProblematicTimeAssignment
  }
  
  console.log('🧪 Assignment Builder Test utilities loaded!')
  console.log('Run: assignmentBuilderTest.runAllTests()')
}
