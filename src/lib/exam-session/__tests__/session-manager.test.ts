/**
 * Test Suite for Session Manager
 * Kiểm tra các chức năng core của exam session management
 */

// Jest globals - using any type to avoid type definition issues
declare const describe: any
declare const it: any
declare const expect: any
declare const beforeEach: any
declare const afterEach: any
declare const jest: any
import { 
  createExamSession, 
  startExamSession, 
  pauseExamSession, 
  resumeExamSession,
  completeExamSession,
  updateAnswer,
  generateStudentSeed,
  shuffleWithSeed
} from '../session-manager'
import { ExamSession, AntiCheatConfig, FallbackConfig } from '@/types/exam-system'
import { AssignmentData } from '@/types/assignment-builder'

// Mock data
const mockAssignment: AssignmentData = {
  title: 'Test Assignment',
  description: 'Test Description',
  type: 'QUIZ',
  timeSettings: {
    dueDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // 1 hour from now
    openAt: new Date().toISOString().slice(0, 16),
    lockAt: '',
    timeLimitMinutes: '60'
  },
  quizQuestions: [
    {
      id: 'q1',
      content: 'Test Question 1',
      type: 'SINGLE',
      order: 1,
      options: [
        { label: 'A', content: 'Option A', isCorrect: true },
        { label: 'B', content: 'Option B', isCorrect: false }
      ]
    }
  ]
}

const mockAntiCheatConfig: AntiCheatConfig = {
  shuffleQuestions: true,
  shuffleOptions: true,
  singleQuestionMode: false,
  requireFullscreen: false,
  detectTabSwitch: false,
  disableCopyPaste: false,
  preset: 'BASIC'
}

const mockFallbackConfig: FallbackConfig = {
  gracePeriodMinutes: 3,
  maxReconnects: 2,
  autoApproveGrace: true,
  autoSaveInterval: 10,
  suspiciousThreshold: 3,
  offlineMode: false
}

describe('Session Manager', () => {
  let session: ExamSession

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createExamSession', () => {
    it('should create a new exam session successfully', async () => {
      const result = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )

      expect(result).toBeDefined()
      expect(result.assignmentId).toBe('assignment-1')
      expect(result.studentId).toBe('student-1')
      expect(result.status).toBe('NOT_STARTED')
      expect(result.questionOrder).toHaveLength(1)
      expect(result.answers).toEqual({})
      expect(result.disconnectCount).toBe(0)
    })

    it('should generate consistent question order with same seed', async () => {
      const session1 = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )

      const session2 = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )

      expect(session1.questionOrder).toEqual(session2.questionOrder)
    })
  })

  describe('startExamSession', () => {
    beforeEach(async () => {
      session = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )
    })

    it('should start exam session successfully', async () => {
      const result = await startExamSession(session)

      expect(result.status).toBe('IN_PROGRESS')
      expect(result.startTime).toBeDefined()
      expect(result.updatedAt).toBeDefined()
    })
  })

  describe('pauseExamSession', () => {
    beforeEach(async () => {
      session = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )
      session = await startExamSession(session)
    })

    it('should pause exam session successfully', async () => {
      const result = await pauseExamSession(session, 'DISCONNECT_DETECTED')

      expect(result.status).toBe('PAUSED')
      expect(result.disconnectCount).toBe(1)
      expect(result.updatedAt).toBeDefined()
    })
  })

  describe('resumeExamSession', () => {
    beforeEach(async () => {
      session = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )
      session = await startExamSession(session)
      session = await pauseExamSession(session)
    })

    it('should resume exam session with grace period', async () => {
      const result = await resumeExamSession(session, mockFallbackConfig)

      expect(result.status).toBe('IN_PROGRESS')
      expect(result.totalGraceTime).toBeGreaterThan(0)
      expect(result.timeRemaining).toBeGreaterThan(session.timeRemaining)
    })
  })

  describe('updateAnswer', () => {
    beforeEach(async () => {
      session = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )
      session = await startExamSession(session)
    })

    it('should update answer successfully', async () => {
      const result = await updateAnswer(session, 'q1', 'A')

      expect(result.answers['q1']).toBe('A')
      expect(result.updatedAt).toBeDefined()
    })

    it('should handle multiple choice answers', async () => {
      const result = await updateAnswer(session, 'q1', ['A', 'B'])

      expect(result.answers['q1']).toEqual(['A', 'B'])
    })
  })

  describe('completeExamSession', () => {
    beforeEach(async () => {
      session = await createExamSession(
        'assignment-1',
        'student-1',
        mockAssignment,
        mockAntiCheatConfig,
        mockFallbackConfig,
        'test-user-agent',
        '127.0.0.1'
      )
      session = await startExamSession(session)
    })

    it('should complete exam session successfully', async () => {
      const result = await completeExamSession(session)

      expect(result.status).toBe('COMPLETED')
      expect(result.actualEndTime).toBeDefined()
      expect(result.timeRemaining).toBe(0)
    })
  })

  describe('Utility Functions', () => {
    describe('generateStudentSeed', () => {
      it('should generate consistent seed for same inputs', () => {
        const seed1 = generateStudentSeed('student-1', 'assignment-1')
        const seed2 = generateStudentSeed('student-1', 'assignment-1')
        
        expect(seed1).toBe(seed2)
      })

      it('should generate different seeds for different inputs', () => {
        const seed1 = generateStudentSeed('student-1', 'assignment-1')
        const seed2 = generateStudentSeed('student-2', 'assignment-1')
        
        expect(seed1).not.toBe(seed2)
      })
    })

    describe('shuffleWithSeed', () => {
      it('should shuffle array consistently with same seed', () => {
        const array = [1, 2, 3, 4, 5]
        const shuffled1 = shuffleWithSeed(array, 'test-seed')
        const shuffled2 = shuffleWithSeed(array, 'test-seed')
        
        expect(shuffled1).toEqual(shuffled2)
      })

      it('should produce different results with different seeds', () => {
        const array = [1, 2, 3, 4, 5]
        const shuffled1 = shuffleWithSeed(array, 'seed-1')
        const shuffled2 = shuffleWithSeed(array, 'seed-2')
        
        expect(shuffled1).not.toEqual(shuffled2)
      })

      it('should preserve all elements', () => {
        const array = [1, 2, 3, 4, 5]
        const shuffled = shuffleWithSeed(array, 'test-seed')
        
        expect(shuffled.sort()).toEqual(array.sort())
      })
    })
  })
})
