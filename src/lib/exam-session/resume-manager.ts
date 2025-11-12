/**
 * Resume Manager
 * Quản lý việc khôi phục bài thi khi học sinh reconnect sau disconnect
 */

import { ExamSession, AutoSaveData, FallbackConfig, EXAM_CONSTANTS } from '@/types/exam-system'
import { autoSaveManager } from './auto-save'
import { personalTimerManager } from './personal-timer'
import { logExamEvent, resumeExamSession } from './session-manager'

/**
 * Interface cho Resume Data
 */
export interface ResumeData {
  session: ExamSession
  autoSave?: AutoSaveData
  timeDifference: number // milliseconds giữa lần cuối và hiện tại
  canResume: boolean
  resumeOptions: ResumeOption[]
  warnings: string[]
  errors: string[]
}

/**
 * Các tùy chọn khôi phục
 */
export interface ResumeOption {
  id: string
  title: string
  description: string
  recommended: boolean
  action: 'RESUME_FROM_SESSION' | 'RESUME_FROM_AUTOSAVE' | 'RESTART' | 'MANUAL_REVIEW'
  graceTimeSeconds?: number
  dataSource: 'SESSION' | 'AUTOSAVE' | 'NONE'
}

/**
 * Kết quả khôi phục
 */
export interface ResumeResult {
  success: boolean
  session: ExamSession
  message: string
  graceTimeAdded: number
  dataRestored: {
    answers: number
    currentQuestion: number
    timeRemaining: number
  }
}

/**
 * Resume Manager Class
 */
export class ResumeManager {
  /**
   * Kiểm tra khả năng khôi phục cho một session
   */
  static async checkResumeCapability(
    sessionId: string,
    studentId: string,
    fallbackConfig: FallbackConfig
  ): Promise<ResumeData> {
    const warnings: string[] = []
    const errors: string[] = []
    let canResume = true

    try {
      // Lấy session hiện tại (từ database)
      const session = await this.getSessionFromDatabase(sessionId)
      if (!session) {
        errors.push('Không tìm thấy phiên thi')
        return {
          session: {} as ExamSession,
          timeDifference: 0,
          canResume: false,
          resumeOptions: [],
          warnings,
          errors
        }
      }

      // Kiểm tra session có thuộc về student không
      if (session.studentId !== studentId) {
        errors.push('Phiên thi không thuộc về học sinh này')
        canResume = false
      }

      // Lấy auto-save data
      const autoSave = await autoSaveManager.restoreFromAutoSave(sessionId) || undefined

      // Tính thời gian chênh lệch
      const now = new Date()
      const timeDifference = now.getTime() - session.updatedAt.getTime()

      // Kiểm tra các điều kiện khôi phục
      const checks = this.performResumeChecks(session, autoSave, timeDifference, fallbackConfig)
      warnings.push(...checks.warnings)
      errors.push(...checks.errors)
      
      if (checks.errors.length > 0) {
        canResume = false
      }

      // Tạo các tùy chọn khôi phục
      const resumeOptions = this.generateResumeOptions(session, autoSave, timeDifference, fallbackConfig)

      return {
        session,
        autoSave,
        timeDifference,
        canResume,
        resumeOptions,
        warnings,
        errors
      }

    } catch (error) {
      console.error('[RESUME] Lỗi khi kiểm tra khả năng khôi phục:', error)
      errors.push('Lỗi hệ thống khi kiểm tra khôi phục')
      
      return {
        session: {} as ExamSession,
        timeDifference: 0,
        canResume: false,
        resumeOptions: [],
        warnings,
        errors
      }
    }
  }

  /**
   * Thực hiện khôi phục bài thi
   */
  static async resumeExam(
    sessionId: string,
    studentId: string,
    selectedOption: ResumeOption,
    fallbackConfig: FallbackConfig
  ): Promise<ResumeResult> {
    try {
      console.log(`[RESUME] Bắt đầu khôi phục session ${sessionId} với option ${selectedOption.id}`)

      // Lấy session và auto-save
      const session = await this.getSessionFromDatabase(sessionId)
      if (!session) {
        throw new Error('Không tìm thấy phiên thi')
      }

      const autoSave = await autoSaveManager.restoreFromAutoSave(sessionId)

      let restoredSession: ExamSession
      let graceTimeAdded = 0
      let dataRestored = {
        answers: 0,
        currentQuestion: 0,
        timeRemaining: 0
      }

      switch (selectedOption.action) {
        case 'RESUME_FROM_SESSION':
          restoredSession = await this.resumeFromSession(session, selectedOption.graceTimeSeconds || 0, fallbackConfig)
          graceTimeAdded = selectedOption.graceTimeSeconds || 0
          dataRestored = {
            answers: Object.keys(session.answers).length,
            currentQuestion: session.currentQuestionIndex,
            timeRemaining: session.timeRemaining
          }
          break

        case 'RESUME_FROM_AUTOSAVE':
          if (!autoSave) {
            throw new Error('Không tìm thấy dữ liệu auto-save')
          }
          restoredSession = await this.resumeFromAutoSave(session, autoSave, selectedOption.graceTimeSeconds || 0, fallbackConfig)
          graceTimeAdded = selectedOption.graceTimeSeconds || 0
          dataRestored = {
            answers: Object.keys(autoSave.answers).length,
            currentQuestion: autoSave.currentQuestionIndex,
            timeRemaining: autoSave.timeRemaining
          }
          break

        case 'RESTART':
          restoredSession = await this.restartSession(session)
          dataRestored = {
            answers: 0,
            currentQuestion: 0,
            timeRemaining: session.timeRemaining
          }
          break

        default:
          throw new Error(`Unsupported resume action: ${selectedOption.action}`)
      }

      // Khôi phục timer nếu cần
      if (restoredSession.timeRemaining > 0) {
        await this.restoreTimer(restoredSession)
      }

      // Log sự kiện khôi phục
      await logExamEvent(sessionId, 'SESSION_RESUMED', {
        resumeOption: selectedOption.id,
        graceTimeAdded,
        dataSource: selectedOption.dataSource,
        dataRestored
      })

      return {
        success: true,
        session: restoredSession,
        message: `Đã khôi phục thành công bài thi từ ${selectedOption.dataSource.toLowerCase()}`,
        graceTimeAdded,
        dataRestored
      }

    } catch (error) {
      console.error('[RESUME] Lỗi khi khôi phục bài thi:', error)
      
      await logExamEvent(sessionId, 'SESSION_RESUMED', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        selectedOption: selectedOption.id
      }, 'ERROR')

      return {
        success: false,
        session: {} as ExamSession,
        message: error instanceof Error ? error.message : 'Lỗi không xác định',
        graceTimeAdded: 0,
        dataRestored: { answers: 0, currentQuestion: 0, timeRemaining: 0 }
      }
    }
  }

  /**
   * Thực hiện các kiểm tra điều kiện khôi phục
   */
  private static performResumeChecks(
    session: ExamSession,
    autoSave: AutoSaveData | undefined,
    timeDifference: number,
    fallbackConfig: FallbackConfig
  ): { warnings: string[]; errors: string[] } {
    const warnings: string[] = []
    const errors: string[] = []

    // Kiểm tra trạng thái session
    if (session.status === 'COMPLETED') {
      errors.push('Bài thi đã hoàn thành, không thể khôi phục')
    } else if (session.status === 'TERMINATED') {
      errors.push('Bài thi đã bị chấm dứt, không thể khôi phục')
    } else if (session.status === 'EXPIRED') {
      errors.push('Bài thi đã hết hạn, không thể khôi phục')
    }

    // Kiểm tra số lần disconnect
    if (session.disconnectCount >= fallbackConfig.maxReconnects) {
      errors.push(`Đã vượt quá số lần reconnect tối đa (${fallbackConfig.maxReconnects})`)
    } else if (session.disconnectCount >= fallbackConfig.maxReconnects - 1) {
      warnings.push('Đây là lần reconnect cuối cùng được phép')
    }

    // Kiểm tra thời gian disconnect
    const disconnectMinutes = Math.floor(timeDifference / (1000 * 60))
    if (disconnectMinutes > EXAM_CONSTANTS.SESSION_TIMEOUT) {
      errors.push(`Đã disconnect quá lâu (${disconnectMinutes} phút > ${EXAM_CONSTANTS.SESSION_TIMEOUT} phút)`)
    } else if (disconnectMinutes > 10) {
      warnings.push(`Đã disconnect ${disconnectMinutes} phút`)
    }

    // Kiểm tra thời gian còn lại
    if (session.timeRemaining <= 0) {
      errors.push('Đã hết thời gian làm bài')
    } else if (session.timeRemaining < 300) { // < 5 phút
      warnings.push('Thời gian còn lại rất ít')
    }

    // Kiểm tra auto-save
    if (autoSave) {
      const autoSaveAge = Date.now() - autoSave.timestamp.getTime()
      if (autoSaveAge > 5 * 60 * 1000) { // > 5 phút
        warnings.push('Dữ liệu auto-save đã cũ')
      }
    } else {
      warnings.push('Không có dữ liệu auto-save')
    }

    return { warnings, errors }
  }

  /**
   * Tạo các tùy chọn khôi phục
   */
  private static generateResumeOptions(
    session: ExamSession,
    autoSave: AutoSaveData | undefined,
    timeDifference: number,
    fallbackConfig: FallbackConfig
  ): ResumeOption[] {
    const options: ResumeOption[] = []
    const graceTime = Math.min(fallbackConfig.gracePeriodMinutes * 60, Math.floor(timeDifference / 1000))

    // Option 1: Resume từ session data
    if (session.status === 'IN_PROGRESS' || session.status === 'PAUSED') {
      options.push({
        id: 'resume_session',
        title: 'Tiếp tục từ dữ liệu phiên thi',
        description: `Khôi phục từ lần lưu cuối cùng. Thêm ${Math.floor(graceTime / 60)} phút grace time.`,
        recommended: !autoSave, // Recommend nếu không có auto-save
        action: 'RESUME_FROM_SESSION',
        graceTimeSeconds: graceTime,
        dataSource: 'SESSION'
      })
    }

    // Option 2: Resume từ auto-save (nếu có và mới hơn)
    if (autoSave) {
      const isAutoSaveNewer = autoSave.timestamp > session.updatedAt
      const autoSaveGraceTime = Math.min(
        fallbackConfig.gracePeriodMinutes * 60,
        Math.floor((Date.now() - autoSave.timestamp.getTime()) / 1000)
      )

      options.push({
        id: 'resume_autosave',
        title: 'Tiếp tục từ auto-save',
        description: `Khôi phục từ dữ liệu tự động lưu (${this.formatTimeDifference(autoSave.timestamp)}). Thêm ${Math.floor(autoSaveGraceTime / 60)} phút grace time.`,
        recommended: isAutoSaveNewer,
        action: 'RESUME_FROM_AUTOSAVE',
        graceTimeSeconds: autoSaveGraceTime,
        dataSource: 'AUTOSAVE'
      })
    }

    // Option 3: Restart (chỉ khi cần thiết)
    if (session.disconnectCount < fallbackConfig.maxReconnects) {
      options.push({
        id: 'restart',
        title: 'Làm lại từ đầu',
        description: 'Bắt đầu lại bài thi từ câu hỏi đầu tiên. Tất cả đáp án sẽ bị xóa.',
        recommended: false,
        action: 'RESTART',
        dataSource: 'NONE'
      })
    }

    // Sắp xếp theo độ ưu tiên
    return options.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1
      if (!a.recommended && b.recommended) return 1
      return 0
    })
  }

  /**
   * Khôi phục từ session data
   */
  private static async resumeFromSession(
    session: ExamSession,
    graceTimeSeconds: number,
    fallbackConfig: FallbackConfig
  ): Promise<ExamSession> {
    const restoredSession = await resumeExamSession(session, fallbackConfig)
    
    // Thêm grace time
    if (graceTimeSeconds > 0) {
      restoredSession.timeRemaining += graceTimeSeconds
      restoredSession.totalGraceTime += graceTimeSeconds
    }

    return restoredSession
  }

  /**
   * Khôi phục từ auto-save data
   */
  private static async resumeFromAutoSave(
    session: ExamSession,
    autoSave: AutoSaveData,
    graceTimeSeconds: number,
    fallbackConfig: FallbackConfig
  ): Promise<ExamSession> {
    // Merge auto-save data vào session
    const mergedSession: ExamSession = {
      ...session,
      currentQuestionIndex: autoSave.currentQuestionIndex,
      timeRemaining: autoSave.timeRemaining + graceTimeSeconds,
      answers: autoSave.answers,
      totalGraceTime: session.totalGraceTime + graceTimeSeconds,
      status: 'IN_PROGRESS',
      updatedAt: new Date()
    }

    return mergedSession
  }

  /**
   * Restart session
   */
  private static async restartSession(session: ExamSession): Promise<ExamSession> {
    const restartedSession: ExamSession = {
      ...session,
      status: 'NOT_STARTED',
      currentQuestionIndex: 0,
      answers: {},
      startTime: new Date(),
      updatedAt: new Date()
    }

    return restartedSession
  }

  /**
   * Khôi phục timer
   */
  private static async restoreTimer(session: ExamSession): Promise<void> {
    try {
      // Tạo timer mới với thời gian còn lại
      const durationMinutes = Math.ceil(session.timeRemaining / 60)
      
      personalTimerManager.createTimer(
        session.id,
        session.studentId,
        durationMinutes,
        {
          onTick: (timeRemaining) => {
            // Update session time remaining
            // TODO: Implement real-time sync
          },
          onExpired: () => {
            // Auto-submit when time expires
            // TODO: Implement auto-submit
          }
        }
      )

      // Start timer
      personalTimerManager.startTimer(session.id)
      
      console.log(`[RESUME] Đã khôi phục timer cho session ${session.id}`)
    } catch (error) {
      console.error('[RESUME] Lỗi khi khôi phục timer:', error)
    }
  }

  /**
   * Lấy session từ database (placeholder)
   */
  private static async getSessionFromDatabase(sessionId: string): Promise<ExamSession | null> {
    // TODO: Implement actual database query
    // Tạm thời return null
    return null
  }

  /**
   * Format time difference
   */
  private static formatTimeDifference(timestamp: Date): string {
    const diff = Date.now() - timestamp.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) {
      return 'vừa xong'
    } else if (minutes < 60) {
      return `${minutes} phút trước`
    } else {
      const hours = Math.floor(minutes / 60)
      return `${hours} giờ trước`
    }
  }

  /**
   * Tạo resume summary cho UI
   */
  static createResumeSummary(resumeData: ResumeData): {
    title: string
    description: string
    status: 'success' | 'warning' | 'error'
    details: string[]
  } {
    if (!resumeData.canResume) {
      return {
        title: 'Không thể khôi phục bài thi',
        description: 'Phiên thi không thể được khôi phục do các lỗi sau:',
        status: 'error',
        details: resumeData.errors
      }
    }

    if (resumeData.warnings.length > 0) {
      return {
        title: 'Có thể khôi phục bài thi',
        description: 'Bài thi có thể được khôi phục nhưng có một số cảnh báo:',
        status: 'warning',
        details: resumeData.warnings
      }
    }

    return {
      title: 'Sẵn sàng khôi phục bài thi',
      description: 'Bài thi có thể được khôi phục an toàn.',
      status: 'success',
      details: [`Đã disconnect ${Math.floor(resumeData.timeDifference / (1000 * 60))} phút`]
    }
  }
}

export default ResumeManager
