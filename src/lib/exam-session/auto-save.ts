/**
 * Auto-Save System
 * Tự động lưu progress của học sinh mỗi 10 giây để recovery khi disconnect
 */

import { AutoSaveData, ExamSession } from '@/types/exam-system'
import { logExamEvent } from './session-manager'

/**
 * Interface cho Auto-Save Manager
 */
export interface AutoSaveConfig {
  interval: number // Khoảng thời gian auto-save (milliseconds)
  maxRetries: number // Số lần retry tối đa khi save fail
  retryDelay: number // Delay giữa các lần retry (milliseconds)
  enableCompression: boolean // Nén dữ liệu trước khi lưu
  enableEncryption: boolean // Mã hóa dữ liệu nhạy cảm
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AutoSaveConfig = {
  interval: 10000, // 10 giây
  maxRetries: 3,
  retryDelay: 1000, // 1 giây
  enableCompression: false,
  enableEncryption: false
}

/**
 * Auto-Save Manager
 */
class AutoSaveManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private saveQueue: Map<string, AutoSaveData> = new Map()
  private isProcessing: Map<string, boolean> = new Map()
  private config: AutoSaveConfig

  constructor(config: Partial<AutoSaveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Bắt đầu auto-save cho một session
   */
  startAutoSave(
    sessionId: string,
    getCurrentState: () => {
      session: ExamSession
      uiState?: Record<string, any>
    }
  ): void {
    // Dừng auto-save cũ nếu có
    this.stopAutoSave(sessionId)

    console.log(`[AUTO_SAVE] Bắt đầu auto-save cho session ${sessionId} (interval: ${this.config.interval}ms)`)

    // Tạo interval mới
    const interval = setInterval(async () => {
      try {
        const state = getCurrentState()
        await this.saveProgress(sessionId, state.session, state.uiState)
      } catch (error) {
        console.error(`[AUTO_SAVE] Lỗi khi auto-save session ${sessionId}:`, error)
        
        // Log lỗi
        await logExamEvent(sessionId, 'AUTO_SAVED', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'ERROR')
      }
    }, this.config.interval)

    this.intervals.set(sessionId, interval)
  }

  /**
   * Dừng auto-save cho một session
   */
  stopAutoSave(sessionId: string): void {
    const interval = this.intervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(sessionId)
      console.log(`[AUTO_SAVE] Dừng auto-save cho session ${sessionId}`)
    }

    // Xóa khỏi queue
    this.saveQueue.delete(sessionId)
    this.isProcessing.delete(sessionId)
  }

  /**
   * Lưu progress ngay lập tức (manual save)
   */
  async saveNow(
    sessionId: string,
    session: ExamSession,
    uiState?: Record<string, any>
  ): Promise<boolean> {
    try {
      await this.saveProgress(sessionId, session, uiState)
      return true
    } catch (error) {
      console.error(`[AUTO_SAVE] Lỗi khi manual save session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Lưu progress với retry logic
   */
  private async saveProgress(
    sessionId: string,
    session: ExamSession,
    uiState?: Record<string, any>
  ): Promise<void> {
    // Kiểm tra xem có đang process không
    if (this.isProcessing.get(sessionId)) {
      console.log(`[AUTO_SAVE] Session ${sessionId} đang được process, bỏ qua`)
      return
    }

    this.isProcessing.set(sessionId, true)

    try {
      // Tạo auto-save data
      const autoSaveData = this.createAutoSaveData(sessionId, session, uiState)
      
      // Thêm vào queue
      this.saveQueue.set(sessionId, autoSaveData)

      // Thực hiện save với retry
      await this.performSaveWithRetry(sessionId, autoSaveData)

      // Log thành công
      await logExamEvent(sessionId, 'AUTO_SAVED', {
        success: true,
        timestamp: autoSaveData.timestamp.toISOString(),
        currentQuestionIndex: autoSaveData.currentQuestionIndex,
        timeRemaining: autoSaveData.timeRemaining,
        answersCount: Object.keys(autoSaveData.answers).length
      })

    } finally {
      this.isProcessing.set(sessionId, false)
    }
  }

  /**
   * Tạo auto-save data từ session
   */
  private createAutoSaveData(
    sessionId: string,
    session: ExamSession,
    uiState?: Record<string, any>
  ): AutoSaveData {
    const now = new Date()

    const autoSaveData: AutoSaveData = {
      sessionId,
      timestamp: now,
      currentQuestionIndex: session.currentQuestionIndex,
      timeRemaining: session.timeRemaining,
      answers: session.answers,
      uiState: {
        scrollPosition: 0,
        selectedOption: undefined,
        isReviewing: false,
        ...uiState
      }
    }

    // Nén dữ liệu nếu được bật
    if (this.config.enableCompression) {
      autoSaveData.answers = this.compressData(autoSaveData.answers)
      autoSaveData.uiState = this.compressData(autoSaveData.uiState)
    }

    // Mã hóa dữ liệu nếu được bật
    if (this.config.enableEncryption) {
      autoSaveData.answers = this.encryptData(autoSaveData.answers)
    }

    return autoSaveData
  }

  /**
   * Thực hiện save với retry logic
   */
  private async performSaveWithRetry(
    sessionId: string,
    autoSaveData: AutoSaveData,
    attempt: number = 1
  ): Promise<void> {
    try {
      // TODO: Thực hiện save vào database
      await this.saveToDatabase(autoSaveData)
      
      console.log(`[AUTO_SAVE] Lưu thành công session ${sessionId} (attempt ${attempt})`)
      
      // Xóa khỏi queue khi save thành công
      this.saveQueue.delete(sessionId)

    } catch (error) {
      console.error(`[AUTO_SAVE] Lỗi save session ${sessionId} (attempt ${attempt}):`, error)

      // Retry nếu chưa đạt max retries
      if (attempt < this.config.maxRetries) {
        console.log(`[AUTO_SAVE] Retry save session ${sessionId} sau ${this.config.retryDelay}ms`)
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
        await this.performSaveWithRetry(sessionId, autoSaveData, attempt + 1)
      } else {
        console.error(`[AUTO_SAVE] Đã retry ${this.config.maxRetries} lần, bỏ cuộc save session ${sessionId}`)
        throw error
      }
    }
  }

  /**
   * Lưu vào database (placeholder)
   */
  private async saveToDatabase(autoSaveData: AutoSaveData): Promise<void> {
    // TODO: Implement actual database save
    // Tạm thời lưu vào localStorage cho demo
    if (typeof window !== 'undefined') {
      const key = `autosave_${autoSaveData.sessionId}`
      const data = JSON.stringify({
        ...autoSaveData,
        timestamp: autoSaveData.timestamp.toISOString()
      })
      localStorage.setItem(key, data)
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * Khôi phục dữ liệu từ auto-save
   */
  async restoreFromAutoSave(sessionId: string): Promise<AutoSaveData | null> {
    try {
      // TODO: Implement actual database restore
      // Tạm thời lấy từ localStorage
      if (typeof window !== 'undefined') {
        const key = `autosave_${sessionId}`
        const data = localStorage.getItem(key)
        
        if (data) {
          const parsed = JSON.parse(data)
          
          // Convert timestamp back to Date
          parsed.timestamp = new Date(parsed.timestamp)
          
          // Giải nén dữ liệu nếu cần
          if (this.config.enableCompression) {
            parsed.answers = this.decompressData(parsed.answers)
            parsed.uiState = this.decompressData(parsed.uiState)
          }

          // Giải mã dữ liệu nếu cần
          if (this.config.enableEncryption) {
            parsed.answers = this.decryptData(parsed.answers)
          }

          console.log(`[AUTO_SAVE] Khôi phục thành công session ${sessionId}`)
          return parsed as AutoSaveData
        }
      }

      return null
    } catch (error) {
      console.error(`[AUTO_SAVE] Lỗi khi khôi phục session ${sessionId}:`, error)
      return null
    }
  }

  /**
   * Xóa auto-save data
   */
  async clearAutoSave(sessionId: string): Promise<void> {
    try {
      // TODO: Implement actual database delete
      if (typeof window !== 'undefined') {
        const key = `autosave_${sessionId}`
        localStorage.removeItem(key)
      }

      console.log(`[AUTO_SAVE] Xóa auto-save data cho session ${sessionId}`)
    } catch (error) {
      console.error(`[AUTO_SAVE] Lỗi khi xóa auto-save session ${sessionId}:`, error)
    }
  }

  /**
   * Lấy danh sách auto-save data có sẵn
   */
  async getAvailableAutoSaves(studentId: string): Promise<AutoSaveData[]> {
    try {
      const autoSaves: AutoSaveData[] = []

      // TODO: Implement actual database query
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('autosave_')) {
            const data = localStorage.getItem(key)
            if (data) {
              const parsed = JSON.parse(data)
              parsed.timestamp = new Date(parsed.timestamp)
              autoSaves.push(parsed)
            }
          }
        }
      }

      return autoSaves.filter(save => save.sessionId.includes(studentId))
    } catch (error) {
      console.error(`[AUTO_SAVE] Lỗi khi lấy danh sách auto-save cho student ${studentId}:`, error)
      return []
    }
  }

  /**
   * Nén dữ liệu (placeholder)
   */
  private compressData(data: any): any {
    // TODO: Implement actual compression (e.g., using pako)
    return data
  }

  /**
   * Giải nén dữ liệu (placeholder)
   */
  private decompressData(data: any): any {
    // TODO: Implement actual decompression
    return data
  }

  /**
   * Mã hóa dữ liệu (placeholder)
   */
  private encryptData(data: any): any {
    // TODO: Implement actual encryption
    return data
  }

  /**
   * Giải mã dữ liệu (placeholder)
   */
  private decryptData(data: any): any {
    // TODO: Implement actual decryption
    return data
  }

  /**
   * Lấy thống kê auto-save
   */
  getStats(): {
    activeSessions: number
    queueSize: number
    totalSaves: number
    failedSaves: number
  } {
    return {
      activeSessions: this.intervals.size,
      queueSize: this.saveQueue.size,
      totalSaves: 0, // TODO: Track this
      failedSaves: 0  // TODO: Track this
    }
  }

  /**
   * Dọn dẹp tất cả auto-save
   */
  cleanup(): void {
    // Dừng tất cả interval
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }

    this.intervals.clear()
    this.saveQueue.clear()
    this.isProcessing.clear()

    console.log('[AUTO_SAVE] Đã dọn dẹp tất cả auto-save')
  }

  /**
   * Cập nhật config
   */
  updateConfig(newConfig: Partial<AutoSaveConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('[AUTO_SAVE] Cập nhật config:', this.config)
  }
}

// Singleton instance
export const autoSaveManager = new AutoSaveManager()

/**
 * Hook để sử dụng auto-save trong React component
 */
export const useAutoSave = (sessionId: string) => {
  return {
    startAutoSave: (getCurrentState: () => { session: ExamSession; uiState?: Record<string, any> }) =>
      autoSaveManager.startAutoSave(sessionId, getCurrentState),
    
    stopAutoSave: () => autoSaveManager.stopAutoSave(sessionId),
    
    saveNow: (session: ExamSession, uiState?: Record<string, any>) =>
      autoSaveManager.saveNow(sessionId, session, uiState),
    
    restore: () => autoSaveManager.restoreFromAutoSave(sessionId),
    
    clear: () => autoSaveManager.clearAutoSave(sessionId),
    
    stats: autoSaveManager.getStats()
  }
}

/**
 * Utility để tạo auto-save từ exam session
 */
export const createAutoSaveFromSession = (session: ExamSession): AutoSaveData => {
  return {
    sessionId: session.id,
    timestamp: new Date(),
    currentQuestionIndex: session.currentQuestionIndex,
    timeRemaining: session.timeRemaining,
    answers: session.answers,
    uiState: {
      scrollPosition: 0,
      selectedOption: undefined,
      isReviewing: false
    }
  }
}

/**
 * Utility để merge auto-save data vào session
 */
export const mergeAutoSaveToSession = (
  session: ExamSession,
  autoSave: AutoSaveData
): ExamSession => {
  return {
    ...session,
    currentQuestionIndex: autoSave.currentQuestionIndex,
    timeRemaining: autoSave.timeRemaining,
    answers: autoSave.answers,
    updatedAt: autoSave.timestamp
  }
}

/**
 * Kiểm tra xem auto-save có mới hơn session không
 */
export const isAutoSaveNewer = (
  session: ExamSession,
  autoSave: AutoSaveData
): boolean => {
  return autoSave.timestamp > session.updatedAt
}

/**
 * Tính toán độ chênh lệch giữa auto-save và session
 */
export const calculateAutoSaveDiff = (
  session: ExamSession,
  autoSave: AutoSaveData
): {
  timeDiff: number // milliseconds
  questionDiff: number
  answersDiff: number
} => {
  const timeDiff = autoSave.timestamp.getTime() - session.updatedAt.getTime()
  const questionDiff = autoSave.currentQuestionIndex - session.currentQuestionIndex
  
  const sessionAnswers = Object.keys(session.answers).length
  const autoSaveAnswers = Object.keys(autoSave.answers).length
  const answersDiff = autoSaveAnswers - sessionAnswers

  return {
    timeDiff,
    questionDiff,
    answersDiff
  }
}
